import tempfile
import subprocess
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils import get_video_duration
from app.utils.file_utils import cleanup_temp_path

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/demo/render")
async def render_demo(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    duration: Optional[str] = Form("0")
):
    """Render demo video - simple passthrough with optional trimming"""
    
    # Validate file type
    if not video.content_type or not video.content_type.startswith('video/'):
        # Also check file extension for formats that might not have proper MIME type
        video_extensions = ['.mp4', '.mov']
        if not any(video.filename.lower().endswith(ext) for ext in video_extensions):
            raise HTTPException(status_code=400, detail="Invalid video file. Please upload .mp4 or .mov files only.")
    
    # Create temporary directory for processing
    temp_dir = Path(tempfile.mkdtemp(prefix="demo_"))
    
    try:
        # Save uploaded video file
        video_path = temp_dir / f"demo_input{Path(video.filename).suffix}"
        
        # Write uploaded video file
        with open(video_path, "wb") as f:
            content = await video.read()
            f.write(content)
        
        # Get video duration if not provided
        video_duration = float(duration) if duration and float(duration) > 0 else None
        if not video_duration:
            video_duration = get_video_duration(video_path)
        
        # Create output video path
        output_path = temp_dir / f"demo-output.mp4"
        
        # For demo template, we just need to ensure the video is in the right format
        # Convert to standard format for consistency - match ALL other templates exactly
        # CRITICAL: Demo must have identical specs to other templates for concatenation
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(video_path),
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30",  # Normalize resolution and fps to exactly 30fps
            "-c:v", "libx264",
            "-preset", "fast",  # Good balance of speed/quality
            "-crf", "23",  # Standard high quality
            "-profile:v", "high",  # H.264 profile (match other templates)
            "-level", "4.0",  # H.264 level
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "48000",  # 48kHz sample rate (match all templates)
            "-ac", "2",  # Force stereo audio (convert mono to stereo if needed)
            "-movflags", "+faststart",  # Optimize for web playback
            "-pix_fmt", "yuv420p",      # Ensure compatibility
            "-vsync", "cfr",  # CRITICAL: Constant frame rate for proper concatenation
            "-max_muxing_queue_size", "1024",  # Prevent buffer issues
            str(output_path)
        ]
        
        # Allow longer FFmpeg runs for large demo uploads (e.g., 4K screen recordings).
        # Encoding generally takes longer than realtime, so give a buffer that scales
        # with the uploaded video's duration while keeping sane upper/lower bounds.
        min_timeout = 90  # Seconds
        max_timeout = 600  # Cap to prevent runaway jobs
        duration_based_timeout = int((video_duration or 60) * 3) + 30
        processing_timeout = max(min_timeout, min(max_timeout, duration_based_timeout))
        
        # Execute FFmpeg command
        print(f"Running FFmpeg command: {' '.join(cmd)}")
        
        # Use Popen to avoid subprocess deadlock on large outputs
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=temp_dir
            )
            
            # Wait for completion with timeout
            stdout, stderr = process.communicate(timeout=processing_timeout)
            
            # Create result object similar to subprocess.run
            class Result:
                def __init__(self, returncode, stdout, stderr):
                    self.returncode = returncode
                    self.stdout = stdout
                    self.stderr = stderr
            
            result = Result(process.returncode, stdout, stderr)
            
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            cleanup_temp_path(temp_dir)  # Immediate cleanup on timeout
            logger.error(f"FFmpeg timed out for {temp_dir}. Last output: {stderr[-500:]}")
            raise HTTPException(
                status_code=500,
                detail=f"FFmpeg processing timed out after {processing_timeout} seconds"
            )
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            print(f"FFmpeg stdout: {result.stdout}")
            cleanup_temp_path(temp_dir)  # Immediate cleanup on FFmpeg failure
            logger.error(f"FFmpeg failed for {temp_dir}: {result.stderr}")
            raise HTTPException(
                status_code=500, 
                detail=f"Video processing failed: {result.stderr}"
            )
        
        # Verify output file was created
        if not output_path.exists():
            cleanup_temp_path(temp_dir)  # Immediate cleanup on missing output
            raise HTTPException(status_code=500, detail="Output video file was not created")
        
        # Schedule cleanup AFTER FileResponse finishes streaming
        background_tasks.add_task(cleanup_temp_path, temp_dir)
        
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="demo-video.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Defensive cleanup on any other exception
        cleanup_temp_path(temp_dir)
        logger.exception(f"Unexpected error during demo render for {temp_dir}")
        raise HTTPException(status_code=500, detail=f"Failed to process demo video: {str(e)}")
