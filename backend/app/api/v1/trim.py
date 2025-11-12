from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import tempfile
import subprocess
import os
import logging
from pathlib import Path
import shutil
from app.utils.file_utils import cleanup_temp_path

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/trim/preview")
async def generate_preview(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...)
):
    """
    Generate a browser-compatible H.264 preview of a video file.
    Converts unsupported codecs (ProRes, H.265, etc.) to H.264/MP4.
    
    Args:
        video: The video file to convert for preview
    
    Returns:
        Browser-compatible MP4 video with metadata (duration)
    """
    if not video.filename:
        raise HTTPException(status_code=400, detail="No video file provided")
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp(prefix="preview_")
    
    try:
        # Save uploaded file
        input_path = os.path.join(temp_dir, "input" + Path(video.filename).suffix)
        with open(input_path, "wb") as f:
            shutil.copyfileobj(video.file, f)
        
        # Get video duration and metadata using ffprobe
        probe_cmd = [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration:stream=width,height",
            "-of", "json", input_path
        ]
        
        try:
            process = subprocess.Popen(
                probe_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate(timeout=30)
            
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, probe_cmd, stdout, stderr)
            
            import json
            probe_data = json.loads(stdout)
            duration = float(probe_data.get('format', {}).get('duration', 0))
            
        except subprocess.CalledProcessError:
            cleanup_temp_path(temp_dir)  # Immediate cleanup on ffprobe failure
            raise HTTPException(status_code=400, detail="Could not read video metadata")
        except subprocess.TimeoutExpired:
            process.kill()
            cleanup_temp_path(temp_dir)  # Immediate cleanup on timeout
            raise HTTPException(status_code=400, detail="FFprobe timed out")
        
        # Output file
        output_path = os.path.join(temp_dir, "preview.mp4")
        
        # Convert to H.264/AAC for browser compatibility
        # Use fast preset for quick conversion
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", input_path,
            "-c:v", "libx264",  # H.264 video (widely supported)
            "-preset", "veryfast",  # Fast encoding for preview
            "-crf", "28",  # Lower quality for smaller file
            "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",  # Max 720p for preview
            "-c:a", "aac",  # AAC audio
            "-b:a", "128k",  # Lower audio bitrate
            "-movflags", "+faststart",  # Optimize for streaming
            "-max_muxing_queue_size", "1024",  # Handle timing issues
            output_path
        ]
        
        # Run FFmpeg
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion with timeout (max 2 minutes for conversion)
            stdout, stderr = process.communicate(timeout=120)
            
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, cmd, stdout, stderr)
                
        except subprocess.CalledProcessError as e:
            cleanup_temp_path(temp_dir)  # Immediate cleanup on FFmpeg failure
            logger.error(f"FFmpeg preview conversion failed: {e.stderr}")
            raise HTTPException(
                status_code=500, 
                detail=f"FFmpeg preview conversion failed: {e.stderr}"
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            cleanup_temp_path(temp_dir)  # Immediate cleanup on timeout
            logger.error(f"Preview conversion timed out")
            raise HTTPException(
                status_code=500,
                detail="Preview conversion timed out"
            )
        
        # Check if output file exists
        if not os.path.exists(output_path):
            cleanup_temp_path(temp_dir)  # Immediate cleanup on missing output
            raise HTTPException(status_code=500, detail="Failed to create preview file")
        
        # Schedule cleanup AFTER FileResponse finishes streaming
        background_tasks.add_task(cleanup_temp_path, temp_dir)
        
        # Return the preview file
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="preview.mp4",
            headers={
                "X-Video-Duration": str(duration),
                "X-Preview-Generated": "true"
            }
        )
        
    except Exception as e:
        # Defensive cleanup on any other exception
        cleanup_temp_path(temp_dir)
        logger.exception(f"Unexpected error during preview generation for {temp_dir}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trim")
async def trim_video(
    background_tasks: BackgroundTasks,
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
            # Use Popen to avoid subprocess deadlock
            process = subprocess.Popen(
                duration_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate(timeout=30)
            
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, duration_cmd, stdout, stderr)
            
            duration = float(stdout.strip())
        except subprocess.CalledProcessError:
            cleanup_temp_path(temp_dir)  # Immediate cleanup on ffprobe failure
            raise HTTPException(status_code=400, detail="Could not determine video duration")
        except subprocess.TimeoutExpired:
            process.kill()
            cleanup_temp_path(temp_dir)  # Immediate cleanup on timeout
            raise HTTPException(status_code=400, detail="FFprobe timed out while reading video duration")
        
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
                "ffmpeg", "-y", "-loglevel", "error",  # Overwrite output
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
                "ffmpeg", "-y", "-loglevel", "error",  # Overwrite output
                "-ss", str(start),  # Start time
                "-i", input_path,  # Input file
                "-t", str(trim_duration),  # Duration
                "-c", "copy",  # Copy streams without re-encoding
                output_path
            ]
        
        # Run FFmpeg
        try:
            # Use Popen to avoid subprocess deadlock on large outputs
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion with timeout
            stdout, stderr = process.communicate(timeout=120)  # Longer timeout for trimming
            
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, cmd, stdout, stderr)
                
        except subprocess.CalledProcessError as e:
            cleanup_temp_path(temp_dir)  # Immediate cleanup on FFmpeg failure
            logger.error(f"FFmpeg trim failed: {e.stderr}")
            raise HTTPException(
                status_code=500, 
                detail=f"FFmpeg failed: {e.stderr}"
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            cleanup_temp_path(temp_dir)  # Immediate cleanup on timeout
            logger.error(f"FFmpeg timed out while trimming video")
            raise HTTPException(
                status_code=500,
                detail="FFmpeg timed out while trimming video"
            )
        
        # Check if output file exists
        if not os.path.exists(output_path):
            cleanup_temp_path(temp_dir)  # Immediate cleanup on missing output
            raise HTTPException(status_code=500, detail="Failed to create output file")
        
        # Schedule cleanup AFTER FileResponse finishes streaming
        background_tasks.add_task(cleanup_temp_path, temp_dir)
        
        # Return the file
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="trimmed.mp4"
        )
        
    except Exception as e:
        # Defensive cleanup on any other exception
        cleanup_temp_path(temp_dir)
        logger.exception(f"Unexpected error during trim for {temp_dir}")
        raise HTTPException(status_code=500, detail=str(e))
