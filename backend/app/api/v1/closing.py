import tempfile
import subprocess
import urllib.request
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.closing_overlay import ClosingOverlayGenerator
from app.utils import get_audio_duration
from app.utils.media import extract_audio_from_media
from app.utils.easing import slide_up_from_bottom
from app.utils.file_utils import cleanup_temp_path
from app.utils.watermark_overlay import apply_qr_banner_overlay

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/closing/render")
async def render_closing(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    title: Optional[str] = Form(""),
    subtitle: Optional[str] = Form(""),
    email: Optional[str] = Form(""),
    teamName: Optional[str] = Form(""),
    duration: Optional[str] = Form("0")
):
    """Render closing video from audio and text overlay only"""
    
    # Accept both audio and video files (we'll extract audio from video)
    if not audio.content_type or (not audio.content_type.startswith('audio/') and not audio.content_type.startswith('video/')):
        # Also check file extension for formats that might not have proper MIME type
        media_extensions = ['.mp3', '.wav', '.aifc', '.aiff', '.m4a', '.mov', '.mp4']
        if not any(audio.filename.lower().endswith(ext) for ext in media_extensions):
            raise HTTPException(status_code=400, detail="Invalid audio or video file")
    
    # Create temporary directory for processing
    temp_dir = Path(tempfile.mkdtemp(prefix="closing_"))
    
    try:
        # Save uploaded audio file
        media_path = temp_dir / f"media{Path(audio.filename).suffix}"
        
        # Write uploaded audio file
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
        has_overlay = bool(title or subtitle or email or teamName)
        
        if has_overlay:
            try:
                overlay_generator = ClosingOverlayGenerator()
                overlay_path = await overlay_generator.generate_closing_overlay_png(
                    title=title or '',
                    subtitle=subtitle or '',
                    email=email or '',
                    team_name=teamName or ''
                )
                
                # Verify overlay was created and is not empty
                if not overlay_path or not Path(overlay_path).exists() or Path(overlay_path).stat().st_size == 0:
                    logger.warning("Overlay generation failed or empty file. Continuing without overlay.")
                    has_overlay = False
                    overlay_path = None
                    
            except Exception as e:
                logger.warning(f"Overlay generation failed: {e}. Continuing without overlay.")
                has_overlay = False
                overlay_path = None
        
        # Create output video
        output_path = temp_dir / f"closing-{title or 'video'}.mp4"
        
        # Download Wave.png and highlight.png from Vercel CDN to temp directory
        # movie filter requires local files, not URLs
        wave_url = "https://video-builder-nu.vercel.app/Wave.png"
        highlight_url = "https://video-builder-nu.vercel.app/highlight.png"
        
        wave_path = temp_dir / "Wave.png"
        highlight_path = temp_dir / "highlight.png"
        
        urllib.request.urlretrieve(wave_url, wave_path)
        urllib.request.urlretrieve(highlight_url, highlight_path)
        
        # Build FFmpeg command with closing specific styling (audio + text overlay only)
        filter_parts = []
        
        # Create background with standard color scheme
        bg_color = "0x0C090E"  # Standard background color (#0C090E)
        
        # Create main background canvas (no image, just background)
        filter_parts.append(f"color=c={bg_color}:size=1920x1080:duration={audio_duration}:rate=30[bg]")
        
        # Scale and position wave (input 1 when has_overlay, input 1 when no overlay)
        filter_parts.append(f"[1:v]scale=2304:-1[wave_scaled]")
        
        # Slide in from bottom over 0.5 seconds with ease-out cubic
        wave_y_expr = slide_up_from_bottom(final_y=730, duration=0.5, easing="ease_out_cubic")
        wave_overlay = f"[bg][wave_scaled]overlay=x=-192:y={wave_y_expr}[wave_bg]"
        filter_parts.append(wave_overlay)
        
        # Add Highlight.png overlay with fade in animation (input 2)
        # Fade in over 0.3 seconds
        filter_parts.append(f"[2:v]fade=t=in:st=0:d=0.3:alpha=1[faded_highlight]")
        
        # Position: center top aligned, mostly off-screen (same as Feature/HowItWorks)
        highlight_overlay = f"[wave_bg][faded_highlight]overlay=(W-w)/2:-300[highlight_video]"
        filter_parts.append(highlight_overlay)
        
        if has_overlay and overlay_path:
            # Closing text overlay is full-screen (1920x1080), so position at 0,0
            # Add fade in animation - start at 0.5s (after wave animation), fade over 0.4s
            # Text overlay is input 3
            filter_parts.append(f"[3:v]fade=t=in:st=0.5:d=0.4:alpha=1[faded_text]")
            overlay_filter = f"[highlight_video][faded_text]overlay=0:0[final]"
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with overlay using -loop 1 for images
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(audio_path),                 # Input 0: audio
                "-loop", "1", "-i", str(wave_path),    # Input 1: Wave.png (looped)
                "-loop", "1", "-i", str(highlight_path), # Input 2: highlight.png (looped)
                "-loop", "1", "-i", str(overlay_path),   # Input 3: overlay PNG (looped)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[final]",                     # Use final video output
                "-map", "0:a",                         # Use audio from input 0
                "-c:v", "libx264",
                "-preset", "fast",  # Good balance of speed/quality (restored from ultrafast)
                "-crf", "23",  # Standard high quality (restored from 28)
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar", "48000",
                "-ac", "2",  # Force stereo audio
                "-shortest",  # Stop when shortest input ends (audio)
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        else:
            # No text overlay - just wave + highlight + audio with background
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(audio_path),                 # Input 0: audio
                "-loop", "1", "-i", str(wave_path),    # Input 1: Wave.png (looped)
                "-loop", "1", "-i", str(highlight_path), # Input 2: highlight.png (looped)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[highlight_video]",           # Use highlight_video as final
                "-map", "0:a",                         # Use audio from input 0
                "-c:v", "libx264",
                "-preset", "fast",  # Good balance of speed/quality (restored from ultrafast)
                "-crf", "23",  # Standard high quality (restored from 28)
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar", "48000",
                "-ac", "2",  # Force stereo audio
                "-shortest",  # Stop when shortest input ends (audio)
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        
        # Execute FFmpeg command
        logger.info(f"Running FFmpeg command with duration={audio_duration}s")
        
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
            cleanup_temp_path(temp_dir)  # Immediate cleanup on timeout
            logger.error(f"FFmpeg timed out for {temp_dir}. Last output: {stderr[-500:]}")
            raise HTTPException(
                status_code=500,
                detail="FFmpeg processing timed out after 60 seconds"
            )
        
        if result.returncode != 0:
            logger.error(f"FFmpeg failed: {result.stderr[:500]}")
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
        
        # Apply QR banner overlay
        qr_output_path = temp_dir / f"{output_path.stem}_qr.mp4"
        try:
            apply_qr_banner_overlay(output_path, qr_output_path)
            if qr_output_path.exists():
                output_path = qr_output_path
        except FileNotFoundError:
            logger.warning("QR banner file not found; closing video will omit QR overlay.")
        except Exception as qr_exc:
            logger.warning(f"QR banner overlay failed for closing render: {qr_exc}")
        
        # Schedule cleanup AFTER FileResponse finishes streaming
        background_tasks.add_task(cleanup_temp_path, temp_dir)
        
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename=f"closing-{title or 'video'}.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Defensive cleanup on any other exception
        cleanup_temp_path(temp_dir)
        logger.exception(f"Unexpected error during closing render for {temp_dir}")
        raise HTTPException(status_code=500, detail=f"Failed to render closing: {str(e)}")


