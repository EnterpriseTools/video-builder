import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils import get_video_duration

router = APIRouter()


@router.post("/demo/render")
async def render_demo(
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
        # Convert to standard format for consistency
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(video_path),
            "-c:v", "libx264",
            "-preset", "fast",  # Good balance of speed/quality (restored from ultrafast)
            "-crf", "23",  # Standard high quality (restored from 28)
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",  # Optimize for web playback
            "-pix_fmt", "yuv420p",      # Ensure compatibility
            str(output_path)
        ]
        
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
            stdout, stderr = process.communicate(timeout=60)
            
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
            print(f"FFmpeg timed out. Last output: {stderr[-500:]}")
            raise HTTPException(
                status_code=500,
                detail="FFmpeg processing timed out after 60 seconds"
            )
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            print(f"FFmpeg stdout: {result.stdout}")
            raise HTTPException(
                status_code=500, 
                detail=f"Video processing failed: {result.stderr}"
            )
        
        # Verify output file was created
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Output video file was not created")
        
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename="demo-video.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process demo video: {str(e)}")
    finally:
        # Cleanup temporary files (but keep them briefly for file download)
        # The temp directory will be cleaned up by the OS eventually
        pass
