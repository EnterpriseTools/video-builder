"""
CS Share image processing endpoints.
Analyzes uploaded screenshots to confirm customer wins and crops to the relevant region.
"""
from __future__ import annotations

import base64
import io
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from ...core.config import settings
from ...utils.openai_client import get_openai_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cs-share", tags=["cs-share"])


def _extract_json_payload(text_response: str) -> Dict[str, Any]:
    """Best-effort parser to pull JSON from the model response."""
    cleaned = text_response.strip()

    # Remove Markdown fencing if present
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse JSON from OpenAI response: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to parse analysis response from OpenAI."
        ) from exc


async def _analyze_image_with_openai(image_bytes: bytes) -> Dict[str, Any]:
    """Call OpenAI Vision model to locate the win content using modern SDK practices."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI is not configured."
        )

    from openai import AsyncOpenAI
    
    # Use modern client initialization without custom httpx (let SDK handle encoding)
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    system_prompt = (
        "You review screenshots of Slack threads or email clients to find authentic customer wins. "
        "Return structured JSON describing whether the screenshot is a true customer shout-out and "
        "define a crop box that preserves the customer's identity and their praise while removing "
        "only the surrounding UI chrome."
    )

    user_prompt = (
        "Analyze the attached screenshot. Determine if it contains positive customer feedback or a win. "
        "If yes, define a crop box that includes:\n"
        "- The customer's name or attribution (sender name, profile, etc.)\n"
        "- The COMPLETE message body expressing the win (every paragraph, nothing cut off)\n"
        "- Any closing salutation that's part of the message\n\n"
        "EXCLUDE from the crop:\n"
        "- Email headers (To, From, Subject lines, timestamps in headers)\n"
        "- Browser chrome (address bars, tabs, window controls)\n"
        "- Application sidebars or navigation menus\n"
        "- Detailed contact information blocks (phone numbers, email addresses, job titles in signatures)\n"
        "- Footer disclaimers or legal text\n\n"
        "CRITICAL: Be VERY generous with horizontal boundaries. Text must NOT be cut off at the edges. "
        "If you see a paragraph that spans the width of the email, the crop box MUST extend beyond the "
        "leftmost and rightmost characters by at least 5-10% to ensure no text is clipped. "
        "It's better to include a bit of extra white space than to cut off even one word.\n\n"
        "For the vertical bounds, include from the start of the message greeting (like 'Good morning') "
        "all the way through the closing salutation and sender name (like 'Respectfully, Chris'). "
        "Stop before detailed job titles, phone numbers, or email addresses.\n\n"
        "Respond strictly with JSON in this format:\n"
        "{\n"
        '  "is_win": true|false,\n'
        '  "confidence": 0.0-1.0,\n'
        '  "summary": "Succinct human-readable summary of the win",\n'
        '  "reason": "Why you flagged it as a win or not",\n'
        '  "channel": "slack"|"email"|"other",\n'
        '  "highlight_text": "Key quote or excerpt",\n'
        '  "crop_box": {\n'
        '    "x_min": 0-1,\n'
        '    "y_min": 0-1,\n'
        '    "x_max": 0-1,\n'
        '    "y_max": 0-1\n'
        "  }\n"
        "}\n"
        "Coordinates must be normalized (0-1) where (0,0) is top-left. "
        "The backend will add safety margins automatically, so focus on capturing the content boundaries. "
        "If this is not a real win, set is_win to false, confidence under 0.5, "
        "provide a reason, and set crop_box to {\"x_min\":0,\"y_min\":0,\"x_max\":1,\"y_max\":1}."
    )

    # Modern practice: use base64 encoding directly in the data URL
    # This is the recommended approach for Vision API as of SDK 2.x
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{encoded_image}",
                            "detail": "high"
                        },
                    },
                ],
            },
        ],
    )

    content = response.choices[0].message.content
    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI did not return a response.",
        )

    return _extract_json_payload(content)


def _crop_image(image: Image.Image, crop_box: Dict[str, Any]) -> Image.Image:
    """Crop the image using normalized coordinates with safety margins."""
    width, height = image.size

    def clamp(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    x_min = clamp(crop_box.get("x_min", 0.0))
    y_min = clamp(crop_box.get("y_min", 0.0))
    x_max = clamp(crop_box.get("x_max", 1.0))
    y_max = clamp(crop_box.get("y_max", 1.0))

    # Add generous safety margins to prevent text cutoff
    HORIZONTAL_MARGIN = 0.05  # 5% padding on left/right
    VERTICAL_MARGIN = 0.03    # 3% padding on top/bottom
    
    # Expand the crop box by the margins
    x_min = max(0.0, x_min - HORIZONTAL_MARGIN)
    y_min = max(0.0, y_min - VERTICAL_MARGIN)
    x_max = min(1.0, x_max + HORIZONTAL_MARGIN)
    y_max = min(1.0, y_max + VERTICAL_MARGIN)

    # Ensure minimum crop size (don't allow overly tiny crops)
    if x_max - x_min < 0.15 or y_max - y_min < 0.15:
        # Fallback to most of the image if crop is too small
        x_min, y_min, x_max, y_max = 0.05, 0.05, 0.95, 0.95

    left = int(x_min * width)
    upper = int(y_min * height)
    right = int(x_max * width)
    lower = int(y_max * height)

    # Ensure valid box
    if right <= left or lower <= upper:
        return image.copy()

    return image.crop((left, upper, right, lower))


@router.post("/process")
async def process_cs_share_image(file: UploadFile = File(...)) -> JSONResponse:
    """Analyze an uploaded image, confirm the win, and return a cropped version."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file received.")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Unable to read image.") from exc

    # Pass raw bytes to avoid double-encoding issues
    analysis = await _analyze_image_with_openai(contents)

    is_win = analysis.get("is_win", False)
    confidence = float(analysis.get("confidence", 0))
    if not is_win or confidence < 0.5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=analysis.get("reason", "Unable to confirm this is a customer win."),
        )

    crop_box = analysis.get("crop_box") or {}
    cropped = _crop_image(image, crop_box)

    buffer = io.BytesIO()
    cropped.save(buffer, format="PNG")
    processed_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    payload = {
        "croppedImage": f"data:image/png;base64,{processed_b64}",
        "summary": analysis.get("summary", ""),
        "confidence": confidence,
        "channel": analysis.get("channel", "unknown"),
        "highlightText": analysis.get("highlight_text", ""),
        "reason": analysis.get("reason", ""),
    }

    return JSONResponse(payload)

