import tempfile
import subprocess
import urllib.request
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.announcement_overlay import AnnouncementOverlayGenerator
from app.utils import get_audio_duration, extract_audio_from_media
from app.utils.easing import slide_up_from_bottom, slide_in_from_right

router = APIRouter()


@router.post("/announcement/render")
async def render_announcement(
    image: UploadFile = File(...),
    audio: UploadFile = File(...),
    title: Optional[str] = Form(""),
    description: Optional[str] = Form(""),
    duration: Optional[str] = Form("0")
):
    """Render announcement video from image, audio, and text overlay"""
    
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
    temp_dir = Path(tempfile.mkdtemp(prefix="announcement_"))
    
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
        has_overlay = bool(title or description)
        
        if has_overlay:
            try:
                overlay_generator = AnnouncementOverlayGenerator()
                overlay_path = await overlay_generator.generate_announcement_overlay_png(
                    title=title or '',
                    description=description or ''
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
        output_path = temp_dir / f"announcement-{title or 'video'}.mp4"
        
        # Download Wave.png and highlight.png from Vercel CDN to temp directory
        # movie filter requires local files, not URLs
        wave_url = "https://video-builder-nu.vercel.app/Wave.png"
        highlight_url = "https://video-builder-nu.vercel.app/highlight.png"
        
        wave_path = temp_dir / "Wave.png"
        highlight_path = temp_dir / "highlight.png"
        
        urllib.request.urlretrieve(wave_url, wave_path)
        urllib.request.urlretrieve(highlight_url, highlight_path)
        
        # Simplified approach: Use input streams instead of movie filter
        # This avoids the movie filter which can cause timeouts
        # Z-index order: background → highlight → wave → image → text
        
        if has_overlay and overlay_path:
            # Build filter with all inputs as streams
            # Input 0: image, Input 1: text overlay, Input 2: audio, Input 3: wave, Input 4: highlight
            
            # Generate animation expressions
            wave_y_expr = slide_up_from_bottom(final_y=730, duration=0.5, easing="ease_out_cubic")
            image_x_expr = slide_in_from_right(final_x=960, duration=0.5, easing="ease_out_cubic")
            
            filter_complex = (
                # Create background
                f"color=c=0x0C090E:size=1920x1080:duration={audio_duration}:rate=30[bg];"
                
                # Prepare highlight (input 4)
                f"[4:v]loop=loop=-1:size=1:start=0[highlight_loop];"
                f"[bg][highlight_loop]overlay=(W-w)/2:-350[bg_highlight];"
                
                # Prepare wave (input 3) with slide-up animation
                f"[3:v]scale=2304:-1,loop=loop=-1:size=1:start=0[wave_scaled];"
                f"[bg_highlight][wave_scaled]overlay=-192:y={wave_y_expr}[bg_wave];"
                
                # Prepare featured image (input 0) with slide-in animation from right
                f"[0:v]scale=896:1016:force_original_aspect_ratio=decrease[scaled_img];"
                f"[scaled_img]pad=960:1080:(960-iw)/2:(1080-ih)/2:color=0x00000000[img_container];"
                f"[bg_wave][img_container]overlay=x={image_x_expr}:0[bg_img];"
                
                # Add text overlay (input 1)
                f"[bg_img][1:v]overlay=100:440[final]"
            )
            
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-loop", "1", "-i", str(image_path),      # Input 0: featured image
                "-loop", "1", "-i", str(overlay_path),    # Input 1: text overlay
                "-i", str(audio_path),                    # Input 2: audio
                "-loop", "1", "-i", str(wave_path),       # Input 3: wave
                "-loop", "1", "-i", str(highlight_path),  # Input 4: highlight
                "-filter_complex", filter_complex,
                "-map", "[final]",
                "-map", "2:a",
                "-c:v", "libx264",
                "-preset", "fast",      # Good quality, reasonable speed
                "-crf", "23",           # High quality
                "-c:a", "aac",
                "-shortest",            # End when shortest input ends
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        else:
            # No text overlay - simpler filter
            
            # Generate animation expressions
            wave_y_expr = slide_up_from_bottom(final_y=730, duration=0.5, easing="ease_out_cubic")
            image_x_expr = slide_in_from_right(final_x=960, duration=0.5, easing="ease_out_cubic")
            
            filter_complex = (
                f"color=c=0x0C090E:size=1920x1080:duration={audio_duration}:rate=30[bg];"
                f"[3:v]loop=loop=-1:size=1:start=0[highlight_loop];"
                f"[bg][highlight_loop]overlay=(W-w)/2:-350[bg_highlight];"
                f"[2:v]scale=2304:-1,loop=loop=-1:size=1:start=0[wave_scaled];"
                f"[bg_highlight][wave_scaled]overlay=-192:y={wave_y_expr}[bg_wave];"
                f"[0:v]scale=896:1016:force_original_aspect_ratio=decrease[scaled_img];"
                f"[scaled_img]pad=960:1080:(960-iw)/2:(1080-ih)/2:color=0x00000000[img_container];"
                f"[bg_wave][img_container]overlay=x={image_x_expr}:0[final]"
            )
            
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-loop", "1", "-i", str(image_path),      # Input 0
                "-i", str(audio_path),                    # Input 1
                "-loop", "1", "-i", str(wave_path),       # Input 2
                "-loop", "1", "-i", str(highlight_path),  # Input 3
                "-filter_complex", filter_complex,
                "-map", "[final]",
                "-map", "1:a",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-shortest",
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
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
            
            # Wait for completion with increased timeout for quality encoding
            # With fast preset and crf 23, complex compositions need more time
            stdout, stderr = process.communicate(timeout=180)
            
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
                detail="FFmpeg processing timed out after 180 seconds"
            )
        
        print(f"DEBUG: FFmpeg return code: {result.returncode}")
        print(f"DEBUG: FFmpeg stderr length: {len(result.stderr)}")
        print(f"DEBUG: FFmpeg stdout length: {len(result.stdout)}")
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            print(f"FFmpeg stdout: {result.stdout}")
            raise HTTPException(
                status_code=500, 
                detail=f"Video processing failed (exit code {result.returncode}): {result.stderr}"
            )
        
        # Verify output file was created
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Output video file was not created")
        
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename=f"announcement-{title or 'video'}.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render announcement: {str(e)}")
    finally:
        # Cleanup temporary files (but keep them briefly for file download)
        # The temp directory will be cleaned up by the OS eventually
        pass


