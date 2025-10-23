import os
import tempfile
import subprocess
import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import aiofiles
from app.utils.overlay_generator import IntroOverlayGenerator
from app.utils import get_video_duration
from app.utils.easing import slide_up_from_bottom

router = APIRouter()

def escape_text_for_ffmpeg(text: str) -> str:
    """Properly escape text for FFmpeg drawtext filter."""
    return (text.replace("'", "\\'")
               .replace('"', '\\"')
               .replace(":", "\\:")
               .replace(",", "\\,")
               .replace("%", "\\%"))

@router.post("/intro/render")
async def render_intro_video(
    video: UploadFile = File(...),
    team: Optional[str] = Form(""),
    full_name: Optional[str] = Form(""), 
    role: Optional[str] = Form("")
):
    """
    Render an introduction video with animated text overlay.
    
    This is a standalone endpoint for testing and perfecting the intro functionality
    before integrating it back into the full timeline flow.
    """
    
    # Validate file type
    if not video.filename.lower().endswith(('.mov', '.mp4')):
        raise HTTPException(status_code=400, detail="Only .mov and .mp4 files are supported")
    
    # Create temporary directory for processing
    temp_dir = Path(tempfile.mkdtemp(prefix="intro_"))
    
    try:
        # Save uploaded video
        input_path = temp_dir / f"input_{video.filename}"
        async with aiofiles.open(input_path, 'wb') as f:
            content = await video.read()
            await f.write(content)
        
        # Output path
        output_path = temp_dir / f"intro_output.mp4"
        
        # Get video duration for overlay timing
        try:
            video_duration = get_video_duration(str(input_path))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to analyze video: {str(e)}")
        
        # Calculate overlay timing (500ms after start, 500ms before end)
        overlay_start = 0.5
        overlay_end = max(1.0, video_duration - 0.5)  # Ensure at least 300ms display
        
        # Generate PNG overlay using the new system
        overlay_generator = IntroOverlayGenerator()
        overlay_png_path = None
        
        # Build FFmpeg command
        ffmpeg_cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(input_path)]
        
        # Build video filter with PNG overlay
        has_overlay = False
        
        # Check if we have any text to overlay
        if team or full_name or role:
            # Generate the PNG overlay
            overlay_png_path = await overlay_generator.generate_overlay_png(
                team=team,
                full_name=full_name, 
                role=role,
                output_path=str(temp_dir / "overlay.png")
            )
            
            # Verify the PNG was created successfully
            if os.path.exists(overlay_png_path) and os.path.getsize(overlay_png_path) > 0:
                has_overlay = True
                print(f"DEBUG: Overlay PNG generated: {overlay_png_path} ({os.path.getsize(overlay_png_path)} bytes)")
            else:
                print(f"WARNING: Overlay PNG generation failed or empty file")
        
        # Build FFmpeg command based on whether we have an overlay
        if has_overlay and overlay_png_path:
            # Position the overlay at bottom-left with padding
            overlay_x = 40
            overlay_y_final = 940  # Final position: 1080 - 100 (approx overlay height) - 40 (padding)
            animation_duration = 0.5  # Animation duration in seconds
            
            # Create slide-up animation with ease-out cubic easing
            # This provides smooth deceleration, making the overlay feel like it has weight
            overlay_y_expr = slide_up_from_bottom(
                final_y=overlay_y_final,
                duration=animation_duration,
                easing="ease_out_cubic"  # Smooth deceleration for polished feel
            )
            
            # Use filter_complex with movie filter to load PNG with proper alpha handling
            # The format=rgba ensures the PNG's alpha channel is preserved
            # y= expression uses ease-out cubic for smooth, polished animation
            overlay_filter = f"[0:v]scale=1920:1080,fps=30,format=yuva420p[base];movie={overlay_png_path},format=rgba,colorchannelmixer=aa=1[ovr];[base][ovr]overlay={overlay_x}:y={overlay_y_expr}:format=yuv420"
            
            ffmpeg_cmd.extend([
                "-filter_complex", overlay_filter,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                str(output_path)
            ])
        else:
            # No overlay - just re-encode the video
            ffmpeg_cmd.extend([
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                str(output_path)
            ])
        
        # Execute FFmpeg
        print(f"DEBUG: FFmpeg command: {' '.join(ffmpeg_cmd)}")
        print(f"DEBUG: Has overlay: {has_overlay}")
        
        # Use Popen with PIPE to avoid deadlock on large outputs
        # This allows us to read output in real-time and avoid buffer blocking
        try:
            process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion with timeout
            stdout, stderr = process.communicate(timeout=30)
            
            # Create result object similar to subprocess.run
            class Result:
                def __init__(self, returncode, stdout, stderr):
                    self.returncode = returncode
                    self.stdout = stdout
                    self.stderr = stderr
            
            result = Result(process.returncode, stdout, stderr)
            
        except subprocess.TimeoutExpired:
            process.kill()  # Kill the process if it times out
            stdout, stderr = process.communicate()  # Get any output before killing
            print(f"DEBUG: FFmpeg timed out. Last output: {stderr[-500:]}")  # Print last 500 chars
            raise HTTPException(
                status_code=500,
                detail="FFmpeg processing timed out after 30 seconds - video file may be corrupted or FFmpeg is hanging"
            )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Video processing failed: {result.stderr}"
            )
        
        # Return the rendered video
        return FileResponse(
            path=output_path,
            filename=f"intro_{full_name or 'video'}.mp4",
            media_type="video/mp4"
        )
        
    except Exception as e:
        # Clean up temp directory on error
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        # Also clean up overlay PNG if it was created
        if overlay_png_path and overlay_png_path != str(temp_dir / "overlay.png"):
            overlay_generator.cleanup_temp_file(overlay_png_path)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Note: We don't clean up temp_dir here because FileResponse needs the file
        # The OS will clean up temp files eventually
        # Overlay PNG cleanup is handled in the except block if needed
        pass

