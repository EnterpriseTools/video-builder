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
        ffmpeg_cmd = ["ffmpeg", "-y", "-i", str(input_path)]
        
        # Build video filter with PNG overlay
        filter_parts = []
        
        # Add PNG overlay if we have intro data
        has_overlay = bool(team or full_name or role)
        if has_overlay:
            # Generate the PNG overlay
            overlay_png_path = await overlay_generator.generate_overlay_png(
                team=team,
                full_name=full_name, 
                role=role,
                output_path=str(temp_dir / "overlay.png")
            )
            
            # Verify the PNG was created successfully
            if os.path.exists(overlay_png_path) and os.path.getsize(overlay_png_path) > 0:
                # Add the PNG as a second input
                ffmpeg_cmd.extend(["-i", overlay_png_path])
                
                # Position the overlay (simplified - no animation to avoid FFmpeg hanging)
                overlay_x = 40
                overlay_y = 940  # 1080 - 100 (overlay height) - 40 (padding) = 940px from top
                
                # Simple static overlay - animations removed temporarily to fix FFmpeg hanging issue
                overlay_filter = f"[0:v]scale=1920:1080,fps=30[scaled];[scaled][1:v]overlay={overlay_x}:{overlay_y}:enable='between(t,{overlay_start},{overlay_end})'"
                
                filter_parts.append(overlay_filter)
                has_overlay = True
            else:
                # PNG generation failed, proceed without overlay
                has_overlay = False
        
        # If no overlay, we still need to scale the video
        if not has_overlay:
            filter_parts.append("scale=1920:1080,fps=30")
        
        # Combine filters
        video_filter = ",".join(filter_parts) if filter_parts else "scale=1920:1080,fps=30"
        
        # Complete FFmpeg command
        if has_overlay:
            # Use filter_complex for multiple inputs
            ffmpeg_cmd.extend([
                "-filter_complex", video_filter,
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                str(output_path)
            ])
        else:
            # Use simple video filter for single input
            ffmpeg_cmd.extend([
                "-vf", video_filter,
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                str(output_path)
            ])
        
        # Execute FFmpeg
        print(f"DEBUG: FFmpeg command: {' '.join(ffmpeg_cmd)}")
        print(f"DEBUG: Video filter: {video_filter}")
        print(f"DEBUG: Has overlay: {has_overlay}")
        if has_overlay and overlay_png_path:
            print(f"DEBUG: Overlay PNG size: {os.path.getsize(overlay_png_path)} bytes")
        
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        
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

