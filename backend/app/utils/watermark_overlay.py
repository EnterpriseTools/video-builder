"""
Axon Watermark Overlay Utility

This module provides functionality to apply Axon body camera-style watermarks
to rendered videos. The watermark includes:
- Date with dynamic timecode that counts up from 00:00:00 as video plays
- Device identification (AXON + team name)
- Axon logo

The primary Axon watermark is positioned in the top-right corner of the video.
"""

import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple
import logging
import json

logger = logging.getLogger(__name__)


def get_media_dimensions(media_path: Path) -> Tuple[int, int]:
    """Return (width, height) for the first video stream using ffprobe."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        str(media_path),
    ]
    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
        )
        data = json.loads(result.stdout)
        stream = data["streams"][0]
        return int(stream["width"]), int(stream["height"])
    except (subprocess.CalledProcessError, KeyError, IndexError, ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Unable to determine media dimensions for {media_path}") from exc




def escape_text_for_ffmpeg(text: str) -> str:
    """Properly escape text for FFmpeg drawtext filter."""
    return (text.replace("'", "\\'")
               .replace('"', '\\"')
               .replace(":", "\\:")
               .replace(",", "\\,")
               .replace("%", "\\%")
               .replace("[", "\\[")
               .replace("]", "\\]"))


def get_watermark_date() -> str:
    """
    Get formatted date for watermark (without time).
    
    Format: YYYY-MM-DD
    Example: 2025-11-18
    
    Returns:
        Formatted date string
    """
    now = datetime.now()
    # Format: 2025-11-18
    date = now.strftime('%Y-%m-%d')
    return date


def apply_watermark_to_video(
    input_video_path: Path,
    output_video_path: Path,
    team_name: str = "",
    logo_path: Optional[Path] = None,
) -> Path:
    """
    Apply Axon body camera-style watermark to a video.
    
    The watermark includes:
    - Row 1: Date + Dynamic Timecode (YYYY-MM-DD HH:MM:SS counting up from 00:00:00)
    - Row 2: AXON [TEAM_NAME] (or just "AXON" if team_name is empty)
    - Logo: Axon triangle on the right side
    
    Args:
        input_video_path: Path to input video file
        output_video_path: Path where watermarked video will be saved
        team_name: Team name for device info (empty string for just "AXON")
        logo_path: Path to Axon logo image (optional, will look in standard location)
    
    Returns:
        Path to the watermarked output video
        
    Raises:
        subprocess.CalledProcessError: If FFmpeg command fails
        FileNotFoundError: If logo is not found
    """
    
    # Get current date for watermark (time will be dynamic timecode)
    date = get_watermark_date()
    
    # Build device info text
    if team_name and team_name.strip():
        device_text = f"MADE WITH AXON TAKE ONE"
    #    device_text = f"MADE WITH AXON TAKE ONE {team_name.strip().upper()}"
    else:
        device_text = "MADE WITH AXON TAKE ONE"
    
    # Escape date for FFmpeg (only the static part)
    date_escaped = escape_text_for_ffmpeg(date)
    device_text_escaped = escape_text_for_ffmpeg(device_text)
    
    logger.info(f"Applying watermark with date: {date}, device: {device_text}")
    
    # Determine logo path
    if logo_path is None or not logo_path.exists():
        # Look in standard locations
        possible_logo_paths = [
            Path(__file__).parent.parent / "assets" / "axon-delta-yellow.png",  # Backend assets (production)
            Path(__file__).resolve().parents[3] / "frontend" / "public" / "axon-delta-yellow.png",  # Development fallback
        ]
        
        logo_path = None
        for path in possible_logo_paths:
            if path.exists():
                logo_path = path
                logger.info(f"Found logo at: {logo_path}")
                break
        
        if logo_path is None:
            logger.warning("Logo file not found in any location, watermark will be text-only")

    # Build FFmpeg filter complex for watermark
    # The watermark consists of:
    # 1. Semi-transparent dark background box
    # 2. Timestamp text (row 1)
    # 3. Device info text (row 2)
    # 4. Logo image (if available)
    # 5. Optional Axon logo anchored with text cluster
    
    # Font settings for body camera style (monospace, bold)
    font_file = "/System/Library/Fonts/Courier.dfont"  # macOS Courier
    if not Path(font_file).exists():
        # Fallback for Linux
        font_file = "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"
        if not Path(font_file).exists():
            # Try another common location
            font_file = "Courier"  # Let FFmpeg find it
    
    # Build drawtext filters
    # Calculate positions (top-right corner with padding)
    # Watermark: white text with text shadow, no background box
    
    # Text position (top-right corner, moved 20px left from previous position)
    text_x = "main_w-344"  # 344px from right edge (moved left by 20px)
    text_y = "36"  # 36px from top
    
    # Timestamp text (row 1) - date + dynamic timecode that counts up from 00:00:00
    # Using FFmpeg's pts helper (with zero offset) formatted via gmtime to display the current video timestamp
    # The timecode will count up as the video plays (00:00:00, 00:00:01, 00:00:02, etc.)
    # Reduced spacing between date and timecode for tighter layout
    timestamp_text = f"{date_escaped} %{{pts\\:gmtime\\:0\\:%H\\\\\\:%M\\\\\\:%S}}"
    timestamp_filter = f"drawtext=fontfile='{font_file}':text='{timestamp_text}':fontcolor=white:fontsize=18:x={text_x}:y={text_y}:shadowcolor=black@0.5:shadowx=1:shadowy=1"
    
    # Device info text (row 2) - white text with 50% opacity shadow for readability
    device_y = "60"  # text_y + 24px row spacing (increased for 18px font)
    device_filter = f"drawtext=fontfile='{font_file}':text='{device_text_escaped}':fontcolor=white:fontsize=18:x={text_x}:y={device_y}:shadowcolor=black@0.5:shadowx=1:shadowy=1"
    
    # Combine text filters
    text_filters = f"{timestamp_filter},{device_filter}"
    
    # Set up filter graph segments and FFmpeg inputs
    filter_segments = [f"[0:v]{text_filters}[vtxt]"]
    current_label = "vtxt"
    ffmpeg_inputs = ["-i", str(input_video_path)]
    input_index = 1
    
    # Optional Axon logo overlay (top-right cluster)
    if logo_path and logo_path.exists():
        logo_x = "main_w-80"
        logo_y = "25"
        filter_segments.append(f"[{input_index}:v]scale=-1:56[logo]")
        filter_segments.append(f"[{current_label}][logo]overlay={logo_x}:{logo_y}[vlogo]")
        ffmpeg_inputs.extend(["-i", str(logo_path)])
        current_label = "vlogo"
        input_index += 1
    
    filter_complex = ";".join(filter_segments)
    
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        *ffmpeg_inputs,
        "-filter_complex", filter_complex,
        "-map", f"[{current_label}]",
        "-map", "0:a?",  # Copy audio if exists
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(output_video_path)
    ]
    
    logger.info(f"Applying watermark with date: {date} + dynamic timecode, device: {device_text}")
    logger.debug(f"FFmpeg command: {' '.join(cmd)}")
    
    # Execute FFmpeg command
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(timeout=180)  # 3 minute timeout
        
        if process.returncode != 0:
            logger.error(f"FFmpeg watermark failed: {stderr}")
            raise subprocess.CalledProcessError(
                process.returncode, cmd, output=stdout, stderr=stderr
            )
        
        logger.info(f"Successfully applied watermark to video: {output_video_path}")
        return output_video_path
        
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        logger.error(f"FFmpeg watermark timed out: {stderr}")
        raise RuntimeError("Watermark application timed out after 180 seconds")


def apply_qr_banner_overlay(
    input_video_path: Path,
    output_video_path: Path,
) -> Path:
    """
    Apply the QR code banner overlay to a video.
    
    This is a lightweight helper used by template-specific renders (Intro/Closing)
    so the banner is baked into those clips before concatenation.
    """
    possible_qr_paths = [
        Path(__file__).parent.parent / "assets" / "QRCodeBanner.png",
        Path(__file__).resolve().parents[3] / "frontend" / "public" / "QRCodeBanner.png",
    ]
    qr_banner_path = None
    for path in possible_qr_paths:
        if path.exists():
            qr_banner_path = path
            logger.info(f"Found QR code banner at: {qr_banner_path}")
            break
    if qr_banner_path is None:
        raise FileNotFoundError("QRCodeBanner.png not found in backend assets or frontend/public")
    
    video_width, _ = get_media_dimensions(input_video_path)
    qr_original_width, qr_original_height = get_media_dimensions(qr_banner_path)
    qr_design_ratio = 380 / 1920  # Desired width relative to 1080p video
    qr_target_width = int(round(video_width * qr_design_ratio))
    qr_target_width = max(1, min(qr_target_width, qr_original_width))
    qr_aspect_ratio = qr_original_height / qr_original_width if qr_original_width else 1
    qr_target_height = max(1, int(round(qr_target_width * qr_aspect_ratio)))
    
    filter_complex = (
        f"[1:v]scale={qr_target_width}:{qr_target_height}[qr];"
        f"[0:v][qr]overlay=main_w-w-16:main_h-h-16[v]"
    )
    
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(input_video_path),
        "-i", str(qr_banner_path),
        "-filter_complex", filter_complex,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(output_video_path)
    ]
    
    logger.info(
        "Applying QR banner overlay: video_width=%s target_width=%s target_height=%s",
        video_width,
        qr_target_width,
        qr_target_height,
    )
    logger.debug(f"FFmpeg QR command: {' '.join(cmd)}")
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(timeout=180)
        if process.returncode != 0:
            logger.error(f"FFmpeg QR overlay failed: {stderr}")
            raise subprocess.CalledProcessError(
                process.returncode, cmd, output=stdout, stderr=stderr
            )
        
        logger.info(f"Successfully applied QR banner overlay: {output_video_path}")
        return output_video_path
    
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        logger.error(f"FFmpeg QR overlay timed out: {stderr}")
        raise RuntimeError("QR banner overlay timed out after 180 seconds")

