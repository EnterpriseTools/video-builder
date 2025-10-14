import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.persona_overlay import PersonaOverlayGenerator
from app.utils import get_audio_duration, extract_audio_from_media

router = APIRouter()

@router.post("/persona/render")
async def render_persona(
    image: UploadFile = File(...),
    audio: UploadFile = File(...),
    name: Optional[str] = Form(""),
    title: Optional[str] = Form(""),
    industry: Optional[str] = Form(""),
    duration: Optional[str] = Form("0")
):
    """Render persona video from fullscreen image, audio, and text overlay"""
    
    # Validate files
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Accept both audio and video files (we'll extract audio from video)
    if not audio.content_type or (not audio.content_type.startswith('audio/') and not audio.content_type.startswith('video/')):
        # Also check file extension for formats that might not have proper MIME type
        media_extensions = ['.mp3', '.wav', '.aifc', '.aiff', '.m4a', '.mov', '.mp4']
        if not any(audio.filename.lower().endswith(ext) for ext in media_extensions):
            raise HTTPException(status_code=400, detail="Invalid audio or video file")
    
    # Create temporary directory for processing
    temp_dir = Path(tempfile.mkdtemp(prefix="persona_"))
    
    try:
        # Save uploaded files
        image_path = temp_dir / f"image{Path(image.filename).suffix}"
        media_path = temp_dir / f"media{Path(audio.filename).suffix}"
        
        # Write uploaded files
        with open(image_path, "wb") as f:
            content = await image.read()
            f.write(content)
            
        with open(media_path, "wb") as f:
            content = await audio.read()
            f.write(content)
        
        # Extract audio if it's a video file, otherwise use as-is
        audio_path = await extract_audio_from_media(media_path, temp_dir)
        
        # Get audio duration if not provided
        audio_duration = float(duration) if duration and float(duration) > 0 else None
        if not audio_duration:
            audio_duration = get_audio_duration(audio_path)
        
        # Generate text overlay PNG if we have text
        overlay_path = None
        has_overlay = bool(name or title or industry)
        
        if has_overlay:
            try:
                overlay_generator = PersonaOverlayGenerator()
                overlay_path = await overlay_generator.generate_persona_overlay_png(
                    name=name or '',
                    title=title or '',
                    industry=industry or ''
                )
                
                # Verify overlay was created and is not empty
                if not overlay_path or not Path(overlay_path).exists() or Path(overlay_path).stat().st_size == 0:
                    print(f"Warning: Overlay generation failed or empty file. Continuing without overlay.")
                    has_overlay = False
                    overlay_path = None
                    
            except Exception as e:
                print(f"Warning: Overlay generation failed: {e}. Continuing without overlay.")
                has_overlay = False
                overlay_path = None
        
        # Create output video
        output_path = temp_dir / f"persona-{name or 'video'}.mp4"
        
        # Build FFmpeg command with persona-specific styling
        filter_parts = []
        
        # Create fullscreen image with specified duration (using simple scale like intro template)
        bg_filter = f"[0:v]scale=1920:1080,setsar=1,fps=30[bg]"
        filter_parts.append(bg_filter)
        
        if has_overlay and overlay_path:
            # Calculate overlay timing - show for most of the video duration
            overlay_start = 0.5
            overlay_end = max(1.0, audio_duration - 0.5)
            
            # Position the overlay (bottom-right, simplified - no animation)
            overlay_x = 1672  # 1920 - 200 - 48 = 1672px from left (48px from right)
            overlay_y = 932  # 1080 - 100 - 48 = 932px from top (48px from bottom)
            
            # Ultra-simple static overlay - no enable parameter
            overlay_filter = f"[bg][1:v]overlay={overlay_x}:{overlay_y}[final]"
            
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with overlay (using filter_complex like intro template)
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", str(image_path),   # Input image (0)
                "-i", str(overlay_path),               # Input overlay PNG (1)
                "-i", str(audio_path),                 # Input audio (2)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[final]",
                "-map", "2:a",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        else:
            # No text overlay - just fullscreen image + audio (like intro template)
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", str(image_path),   # Input image (0)
                "-i", str(audio_path),                 # Input audio (1)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[bg]",
                "-map", "1:a",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        
        # Execute FFmpeg command
        print(f"Running FFmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=temp_dir)
        
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
            filename=f"persona-{name or 'video'}.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render persona: {str(e)}")
    finally:
        # Cleanup temporary files (but keep them briefly for file download)
        pass



