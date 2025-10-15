import tempfile
import subprocess
import urllib.request
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.announcement_overlay import AnnouncementOverlayGenerator
from app.utils import get_audio_duration, extract_audio_from_media

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
        
        # Multi-layer composition with animations
        filter_parts = []
        
        # Layer 1: Background color
        filter_parts.append(f"color=c=0x0C090E:size=1920x1080:duration={audio_duration}:rate=30[bg]")
        
        # Layer 2: Wave overlay with slide-in animation from bottom
        # Scale wave to 2304px wide (120% of 1920)
        filter_parts.append(f"movie={wave_path}:loop=0,setpts=N/(FRAME_RATE*TB),scale=2304:-1[wave]")
        # Slide in from bottom over 0.5 seconds
        wave_y_start = 1080  # Below screen
        wave_y_end = 730  # Final position
        wave_overlay = f"[bg][wave]overlay=-192:'if(lt(t,0.5),{wave_y_start}+({wave_y_end}-{wave_y_start})*t/0.5,{wave_y_end})'[wave_bg]"
        filter_parts.append(wave_overlay)
        
        # Layer 3: Image container with fade in
        # Scale image to fit in 896x1016 container
        filter_parts.append(f"[0:v]scale=896:1016:force_original_aspect_ratio=decrease[scaled_image]")
        # Pad to 960x1080 with transparent background
        filter_parts.append(f"[scaled_image]pad=960:1080:(960-iw)/2:(1080-ih)/2:color=0x00000000[container]")
        # Fade in over 0.5 seconds
        filter_parts.append(f"[container]fade=t=in:st=0:d=0.5:alpha=1[faded_container]")
        # Position on right side
        image_x = 960
        image_overlay = f"[wave_bg][faded_container]overlay={image_x}:0[base]"
        filter_parts.append(image_overlay)
        
        # Layer 4: Highlight overlay with scale animation
        filter_parts.append(f"movie={highlight_path}:loop=0,setpts=N/(FRAME_RATE*TB)[highlight]")
        # Scale from 0.8 to 1.0 over 0.5 seconds for gentle zoom effect
        highlight_scale = "iw*if(lt(t,0.5),0.8+(0.2*t/0.5),1.0)"
        filter_parts.append(f"[highlight]scale='{highlight_scale}':'{highlight_scale}'[scaled_highlight]")
        # Position centered horizontally, partially visible at top
        highlight_x = 460  # Center horizontally: (1920 - 1000) / 2 = 460px
        highlight_y = -100  # Position: partially visible at top
        highlight_overlay = f"[base][scaled_highlight]overlay={highlight_x}:{highlight_y}[highlight_video]"
        filter_parts.append(highlight_overlay)
        
        # Layer 5: Text overlay with slide-in animation from left
        if has_overlay and overlay_path:
            # Slide in from left over 0.5 seconds
            overlay_x_start = -400  # Off-screen left
            overlay_x_end = 100  # Final position with margin
            overlay_y = 440  # Center vertically
            overlay_filter = f"[highlight_video][1:v]overlay='if(lt(t,0.5),{overlay_x_start}+({overlay_x_end}-{overlay_x_start})*t/0.5,{overlay_x_end})':{overlay_y}[final]"
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with text overlay
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-loop", "1", "-i", str(image_path),   # Input image (0)
                "-i", str(overlay_path),               # Input overlay PNG (1)
                "-i", str(audio_path),                 # Input audio (2)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[final]",
                "-map", "2:a",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        else:
            # No text overlay - just end with highlight layer
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-loop", "1", "-i", str(image_path),   # Input image (0)
                "-i", str(audio_path),                 # Input audio (1)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[highlight_video]",
                "-map", "1:a",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
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


