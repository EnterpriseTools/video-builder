"""
Axon Watermark Overlay Utility

This module provides functionality to apply Axon body camera-style watermarks
to rendered videos. The watermark includes:
- Real-time timestamp with timezone
- Device identification (AXON + team name)
- Axon logo

The watermark is positioned in the top-right corner of the video.
"""

import subprocess
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def escape_text_for_ffmpeg(text: str) -> str:
    """Properly escape text for FFmpeg drawtext filter."""
    return (text.replace("'", "\\'")
               .replace('"', '\\"')
               .replace(":", "\\:")
               .replace(",", "\\,")
               .replace("%", "\\%")
               .replace("[", "\\[")
               .replace("]", "\\]"))


def get_watermark_timestamp() -> str:
    """
    Get formatted timestamp for watermark.
    
    Format: YYYY-MM-DD HH:MM:SS
    Example: 2025-11-18 14:32:15
    
    Returns:
        Formatted timestamp string
    """
    now = datetime.now()
    # Format: 2025-11-18 14:32:15
    timestamp = now.strftime('%Y-%m-%d %H:%M:%S')
    return timestamp


def apply_watermark_to_video(
    input_video_path: Path,
    output_video_path: Path,
    team_name: str = "",
    logo_path: Optional[Path] = None
) -> Path:
    """
    Apply Axon body camera-style watermark to a video.
    
    The watermark includes:
    - Row 1: Timestamp (YYYY-MM-DD HH:MM:SS ±ZZZZ)
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
        FileNotFoundError: If logo file is not found
    """
    
    # Get current timestamp for watermark
    timestamp = get_watermark_timestamp()
    
    # Build device info text
    if team_name and team_name.strip():
        device_text = f"AXON {team_name.strip().upper()}"
    else:
        device_text = "AXON"
    
    # Escape text for FFmpeg
    timestamp_escaped = escape_text_for_ffmpeg(timestamp)
    device_text_escaped = escape_text_for_ffmpeg(device_text)
    
    logger.info(f"Applying watermark with timestamp: {timestamp}, device: {device_text}")
    
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
    
    # Text position (top-right corner)
    text_x = "main_w-324"  # 324px from right edge
    text_y = "36"  # 36px from top
    
    # Timestamp text (row 1) - white text with 50% opacity shadow for readability
    timestamp_filter = f"drawtext=fontfile='{font_file}':text='{timestamp_escaped}':fontcolor=white:fontsize=18:x={text_x}:y={text_y}:shadowcolor=black@0.5:shadowx=1:shadowy=1"
    
    # Device info text (row 2) - white text with 50% opacity shadow for readability
    device_y = "60"  # text_y + 24px row spacing (increased for 18px font)
    device_filter = f"drawtext=fontfile='{font_file}':text='{device_text_escaped}':fontcolor=white:fontsize=18:x={text_x}:y={device_y}:shadowcolor=black@0.5:shadowx=1:shadowy=1"
    
    # Combine text filters
    text_filters = f"{timestamp_filter},{device_filter}"
    
    # Add logo overlay if available
    if logo_path and logo_path.exists():
        # Scale logo first, then overlay it
        # Logo should be ~56px height to match larger text size
        # Position: right side of watermark, vertically center-aligned with text
        # Text is 18px tall at y=36, logo is 56px tall
        # To center align: logo_y = text_y - (logo_height - text_height) / 2
        # logo_y = 36 - (56 - 18) / 2 = 36 - 19 = 17
        # Adding 8px padding: 17 + 8 = 25
        
        logo_x = "main_w-80"  # 80px from right edge (gives space for ~70px wide logo + 10px padding)
        logo_y = "25"  # Vertically centered with first text row + 8px padding (17 + 8 = 25)
        
        # Scale logo to height 56px, maintain aspect ratio, then overlay
        # [1:v] = logo input, scale it, then overlay on [vtxt] at the calculated position
        filter_complex = f"[0:v]{text_filters}[vtxt];[1:v]scale=-1:56[logo];[vtxt][logo]overlay={logo_x}:{logo_y}[v]"
        
        # FFmpeg command with logo overlay
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(input_video_path),
            "-i", str(logo_path),
            "-filter_complex", filter_complex,
            "-map", "[v]",
            "-map", "0:a?",  # Copy audio if exists
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "copy",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output_video_path)
        ]
    else:
        # Text-only watermark (no logo)
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(input_video_path),
            "-vf", text_filters,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "copy",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(output_video_path)
        ]
    
    logger.info(f"Applying watermark with timestamp: {timestamp}, device: {device_text}")
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

