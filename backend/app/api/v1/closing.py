import tempfile
import subprocess
import urllib.request
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.closing_overlay import ClosingOverlayGenerator
from app.utils import get_audio_duration
from app.utils.media import extract_audio_from_media
from app.utils.easing import slide_up_from_bottom

router = APIRouter()


@router.post("/closing/render")
async def render_closing(
    audio: UploadFile = File(...),
    title: Optional[str] = Form(""),
    subtitle: Optional[str] = Form(""),
    email: Optional[str] = Form(""),
    teamName: Optional[str] = Form(""),
    directorName: Optional[str] = Form(""),
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
        has_overlay = bool(title or subtitle or email or teamName or directorName)
        
        if has_overlay:
            try:
                overlay_generator = ClosingOverlayGenerator()
                overlay_path = await overlay_generator.generate_closing_overlay_png(
                    title=title or '',
                    subtitle=subtitle or '',
                    email=email or '',
                    team_name=teamName or '',
                    director_name=directorName or ''
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
        
        # Add Wave.png overlay with slide-in animation and fade out at end
        # Load wave using movie filter for animations
        filter_parts.append(f"movie={wave_path}:loop=0,setpts=N/(FRAME_RATE*TB),scale=2304:-1[wave]")
        
        # Slide in from bottom over 0.5 seconds with ease-out cubic
        wave_y_expr = slide_up_from_bottom(final_y=730, duration=0.5, easing="ease_out_cubic")
        wave_overlay = f"[bg][wave]overlay=x=-192:y={wave_y_expr}[wave_bg]"
        filter_parts.append(wave_overlay)
        
        # Add Highlight.png overlay with fade in animation (match Feature/HowItWorks position)
        # Load highlight with movie filter and fade in
        filter_parts.append(f"movie={highlight_path}:loop=0,setpts=N/(FRAME_RATE*TB)[highlight]")
        # Fade in over 0.3 seconds
        filter_parts.append(f"[highlight]fade=t=in:st=0:d=0.3:alpha=1[faded_highlight]")
        
        # Position: center top aligned, mostly off-screen (same as Feature/HowItWorks)
        highlight_overlay = f"[wave_bg][faded_highlight]overlay=(W-w)/2:-300[highlight_video]"
        filter_parts.append(highlight_overlay)
        
        if has_overlay and overlay_path:
            # Closing text overlay is full-screen (1920x1080), so position at 0,0
            # No animation needed - text is already positioned correctly in the PNG
            overlay_filter = f"[highlight_video][0:v]overlay=0:0[final]"
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with overlay (text overlay is input 0)
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(overlay_path),               # Input overlay PNG (0)
                "-i", str(audio_path),                 # Input audio (1)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[final]",                     # Use final video output
                "-map", "1:a",                         # Use audio from second input
                "-c:v", "libx264",
                "-preset", "fast",  # Good balance of speed/quality (restored from ultrafast)
                "-crf", "23",  # Standard high quality (restored from 28)
                "-c:a", "aac",
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        else:
            # No text overlay - just wave + highlight + audio with background
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(audio_path),                 # Input audio (0)
                "-filter_complex", ";".join(filter_parts),  # Use highlight_video as final
                "-map", "[highlight_video]",           # Use highlight_video as final
                "-map", "0:a",                         # Use audio from first input
                "-c:v", "libx264",
                "-preset", "fast",  # Good balance of speed/quality (restored from ultrafast)
                "-crf", "23",  # Standard high quality (restored from 28)
                "-c:a", "aac",
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
            filename=f"closing-{title or 'video'}.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render closing: {str(e)}")
    finally:
        # Cleanup temporary files (but keep them briefly for file download)
        # The temp directory will be cleaned up by the OS eventually
        pass


