import tempfile
import subprocess
import urllib.request
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.how_it_works_overlay import HowItWorksOverlayGenerator
from app.utils import get_audio_duration
from app.utils.media import extract_audio_from_media

router = APIRouter()


@router.post("/how-it-works/render")
async def render_how_it_works(
    audio: UploadFile = File(...),
    title: Optional[str] = Form(""),
    description: Optional[str] = Form(""),
    duration: Optional[str] = Form("0")
):
    """Render how it works video from audio and text overlay only"""
    
    # Accept both audio and video files (we'll extract audio from video)
    if not audio.content_type or (not audio.content_type.startswith('audio/') and not audio.content_type.startswith('video/')):
        # Also check file extension for formats that might not have proper MIME type
        media_extensions = ['.mp3', '.wav', '.aifc', '.aiff', '.m4a', '.mov', '.mp4']
        if not any(audio.filename.lower().endswith(ext) for ext in media_extensions):
            raise HTTPException(status_code=400, detail="Invalid audio or video file")
    
    # Create temporary directory for processing
    temp_dir = Path(tempfile.mkdtemp(prefix="how_it_works_"))
    
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
        has_overlay = bool(title or description)
        
        if has_overlay:
            try:
                overlay_generator = HowItWorksOverlayGenerator()
                overlay_path = await overlay_generator.generate_how_it_works_overlay_png(
                    title=title or '',
                    subtitle='',  # No subtitle in simplified version
                    step_number='',  # No step number in simplified version
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
        output_path = temp_dir / f"how-it-works-{title or 'video'}.mp4"
        
        # Download Wave.png and highlight.png from Vercel CDN to temp directory
        # movie filter requires local files, not URLs
        wave_url = "https://video-builder-nu.vercel.app/Wave.png"
        highlight_url = "https://video-builder-nu.vercel.app/highlight.png"
        
        wave_path = temp_dir / "Wave.png"
        highlight_path = temp_dir / "highlight.png"
        
        urllib.request.urlretrieve(wave_url, wave_path)
        urllib.request.urlretrieve(highlight_url, highlight_path)
        
        # Build FFmpeg command with how-it-works specific styling (audio + text overlay only)
        filter_parts = []
        
        # Create background with standard color scheme
        bg_color = "0x0C090E"  # Standard background color (#0C090E)
        
        # Create main background canvas (no image, just background)
        filter_parts.append(f"color=c={bg_color}:size=1920x1080:duration={audio_duration}:rate=30[bg]")
        
        # Scale and position wave (input 2)
        filter_parts.append(f"[2:v]scale=2304:-1[wave_scaled]")
        filter_parts.append(f"[bg][wave_scaled]overlay=x=-192:y=730[wave_bg]")
        
        # Position highlight (input 3) - centered horizontally, mostly off-screen vertically
        filter_parts.append(f"[wave_bg][3:v]overlay=(W-w)/2:-300[highlight_video]")
        
        if has_overlay and overlay_path:
            # Center text overlay (no animation)
            # Overlay is 1000px wide (HowItWorksStyles.BASE_WIDTH)
            overlay_x = 460  # Center horizontally: (1920 - 1000) / 2 = 460px
            overlay_y = 365  # Center vertically: (1080 - 350) / 2 = 365px (approximate)
            
            # Text overlay - static position, no animation (input 0)
            overlay_filter = f"[highlight_video][0:v]overlay={overlay_x}:{overlay_y}[final]"
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with overlay using -loop 1 for images
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(overlay_path),               # Input 0: overlay PNG
                "-i", str(audio_path),                 # Input 1: audio
                "-loop", "1", "-i", str(wave_path),    # Input 2: Wave.png (looped)
                "-loop", "1", "-i", str(highlight_path), # Input 3: highlight.png (looped)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[final]",                     # Use final video output
                "-map", "1:a",                         # Use audio from input 1
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",                        # Audio bitrate
                "-ar", "48000",                        # Audio sample rate
                "-shortest",                           # Stop when shortest input ends (audio)
                "-t", str(audio_duration),
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
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",                        # Audio bitrate
                "-ar", "48000",                        # Audio sample rate
                "-shortest",                           # Stop when shortest input ends (audio)
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
            filename=f"how-it-works-{title or 'video'}.mp4"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render how it works: {str(e)}")
    finally:
        # Cleanup temporary files (but keep them briefly for file download)
        # The temp directory will be cleaned up by the OS eventually
        pass


