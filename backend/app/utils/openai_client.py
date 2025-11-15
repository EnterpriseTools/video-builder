"""
OpenAI Client Utilities
Handles all interactions with OpenAI API (GPT-4 and DALL-E 3)
"""
from openai import AsyncOpenAI
from typing import List, Dict, Optional
import httpx
import base64
from ..core.config import settings
from .openai_prompts import (
    PERSONA_CONVERSATION_SYSTEM_PROMPT,
    PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE,
    DEFAULT_PERSONA_IMAGE_PROMPT
)

# Initialize OpenAI client
def get_openai_client() -> AsyncOpenAI:
    """Get configured OpenAI client"""
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def chat_with_gpt4(messages: List[Dict[str, str]]) -> str:
    """
    Send a conversation to GPT-4 and get a response.
    
    Args:
        messages: List of message dicts with 'role' and 'content' keys
        
    Returns:
        The assistant's response text
    """
    client = get_openai_client()
    
    # Add system prompt if not present
    if not messages or messages[0].get("role") != "system":
        messages.insert(0, {
            "role": "system",
            "content": PERSONA_CONVERSATION_SYSTEM_PROMPT
        })
    
    response = await client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        temperature=0.7,
        max_tokens=500
    )
    
    return response.choices[0].message.content


async def generate_persona_image(user_description: str) -> str:
    """
    Generate a persona image using DALL-E 3 and return as base64 data URL.
    
    Args:
        user_description: The user's full description compiled from the conversation
        
    Returns:
        Base64 data URL of the generated image (to avoid CORS issues)
    """
    client = get_openai_client()
    
    # Parse the user description into structured components using GPT-4
    if user_description.strip():
        # Use GPT-4 to extract structured fields from the conversation
        parse_prompt = f"""Given this user description of a persona: "{user_description}"

Extract and return ONLY the following four fields in this exact format (one per line):
SUBJECT: [the person's role/profession]
LOCATION: [where they are located, or "their typical workplace" if not specified]
ATTIRE: [what they're wearing, or "standard uniform" if not specified]
BACKGROUND: [background details, or "typical workplace setting" if not specified]

Be concise and specific. Fill in sensible defaults based on the subject if details are missing."""

        parsing_response = await client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": parse_prompt}],
            temperature=0.3,
            max_tokens=200
        )
        
        parsed_text = parsing_response.choices[0].message.content
        
        # Extract the fields from GPT-4's response
        subject = "professional person"
        location = "their typical workplace"
        attire = "standard uniform"
        background = "typical workplace setting"
        
        for line in parsed_text.split('\n'):
            if line.startswith('SUBJECT:'):
                subject = line.replace('SUBJECT:', '').strip()
            elif line.startswith('LOCATION:'):
                location = line.replace('LOCATION:', '').strip()
            elif line.startswith('ATTIRE:'):
                attire = line.replace('ATTIRE:', '').strip()
            elif line.startswith('BACKGROUND:'):
                background = line.replace('BACKGROUND:', '').strip()
        
        # Format the final prompt
        final_prompt = PERSONA_IMAGE_GENERATION_PROMPT_TEMPLATE.format(
            subject=subject,
            location=location,
            attire=attire,
            background=background
        )
    else:
        final_prompt = DEFAULT_PERSONA_IMAGE_PROMPT
    
    # Generate image with DALL-E 3
    response = await client.images.generate(
        model="dall-e-3",
        prompt=final_prompt,
        size="1792x1024",  # 16:9 aspect ratio (closest to 1920x1080)
        quality="hd",
        n=1
    )
    
    image_url = response.data[0].url
    
    # Download the image to avoid CORS issues in frontend
    async with httpx.AsyncClient() as http_client:
        image_response = await http_client.get(image_url)
        image_response.raise_for_status()
        image_bytes = image_response.content
        
        # Convert to base64 data URL
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        data_url = f"data:image/png;base64,{base64_image}"
        
        return data_url

