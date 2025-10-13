from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import tempfile
import subprocess
import os
from pathlib import Path
import shutil

router = APIRouter()

@router.post("/trim")
async def trim_video(
    video: UploadFile = File(...),
    start: float = Form(...),
    end: float = Form(...),
    reencode: bool = Form(False)
):
    """
    Trim a video file using FFmpeg.
    
    Args:
        video: The video file to trim
        start: Start time in seconds
        end: End time in seconds
        reencode: Whether to re-encode the video (default: False for stream copy)
    
    Returns:
        The trimmed video file
    """
    if not video.filename:
        raise HTTPException(status_code=400, detail="No video file provided")
    
    # Validate file type
    if not video.filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
        raise HTTPException(status_code=400, detail="Unsupported video format")
    
    # Validate time parameters
    if start < 0 or end <= start:
        raise HTTPException(status_code=400, detail="Invalid start/end times")
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp(prefix="trim_")
    
    try:
        # Save uploaded file
        input_path = os.path.join(temp_dir, "input" + Path(video.filename).suffix)
        with open(input_path, "wb") as f:
            shutil.copyfileobj(video.file, f)
        
        # Get video duration using ffprobe
        duration_cmd = [
            "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
            "-of", "csv=p=0", input_path
        ]
        
        try:
            duration_result = subprocess.run(duration_cmd, capture_output=True, text=True, check=True)
            duration = float(duration_result.stdout.strip())
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=400, detail="Could not determine video duration")
        
        # Validate end time
        if end > duration:
            end = duration
        
        # Calculate duration
        trim_duration = end - start
        
        # Output file
        output_path = os.path.join(temp_dir, "trimmed.mp4")
        
        # Build FFmpeg command
        if reencode:
            # Re-encode for precise cuts
            cmd = [
                "ffmpeg", "-y",  # Overwrite output
                "-ss", str(start),  # Start time
                "-i", input_path,  # Input file
                "-t", str(trim_duration),  # Duration
                "-c:v", "libx264",  # Video codec
                "-c:a", "aac",  # Audio codec
                "-preset", "fast",  # Encoding preset
                "-crf", "23",  # Quality
                "-movflags", "+faststart",  # Optimize for web
                output_path
            ]
        else:
            # Stream copy for speed (may not be precise at non-keyframe boundaries)
            cmd = [
                "ffmpeg", "-y",  # Overwrite output
                "-ss", str(start),  # Start time
                "-i", input_path,  # Input file
                "-t", str(trim_duration),  # Duration
                "-c", "copy",  # Copy streams without re-encoding
                output_path
            ]
        
        # Run FFmpeg
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            raise HTTPException(
                status_code=500, 
                detail=f"FFmpeg failed: {e.stderr}"
            )
        
        # Check if output file exists
        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Failed to create output file")
        
        # Return the file
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="trimmed.mp4",
            background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
        )
        
    except Exception as e:
        # Clean up on error
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))
