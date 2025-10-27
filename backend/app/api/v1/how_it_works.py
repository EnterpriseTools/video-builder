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
    image: Optional[UploadFile] = File(None),
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
        
        # Save optional image file if provided
        image_path = None
        if image and image.filename:
            image_path = temp_dir / f"image{Path(image.filename).suffix}"
            with open(image_path, "wb") as f:
                image_content = await image.read()
                f.write(image_content)
            print(f"Image uploaded: {image_path} ({image_path.stat().st_size} bytes)")
        
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
        
        # Build FFmpeg command with how-it-works specific styling (audio + optional image + text overlay)
        filter_parts = []
        
        # Create background with standard color scheme
        bg_color = "0x0C090E"  # Standard background color (#0C090E)
        
        # Create main background canvas
        filter_parts.append(f"color=c={bg_color}:size=1920x1080:duration={audio_duration}:rate=30[bg]")
        
        # Determine input indices based on what's available
        # Inputs will be arranged as: [optional: overlay_png] [optional: image] [audio] [wave] [highlight]
        input_idx = 0
        inputs = []
        
        # Input 0: overlay PNG (if has text overlay)
        if has_overlay and overlay_path:
            inputs.append(("-i", str(overlay_path)))
            overlay_input_idx = input_idx
            input_idx += 1
        
        # Input N: optional user image
        if image_path:
            inputs.append(("-loop", "1", "-i", str(image_path)))
            image_input_idx = input_idx
            input_idx += 1
        
        # Input N: audio
        inputs.append(("-i", str(audio_path)))
        audio_input_idx = input_idx
        input_idx += 1
        
        # Input N: Wave.png
        inputs.append(("-loop", "1", "-i", str(wave_path)))
        wave_input_idx = input_idx
        input_idx += 1
        
        # Input N: highlight.png
        inputs.append(("-loop", "1", "-i", str(highlight_path)))
        highlight_input_idx = input_idx
        
        # Scale and position wave
        filter_parts.append(f"[{wave_input_idx}:v]scale=2304:-1[wave_scaled]")
        filter_parts.append(f"[bg][wave_scaled]overlay=x=-192:y=730[wave_bg]")
        
        # Position highlight - centered horizontally, mostly off-screen vertically
        filter_parts.append(f"[wave_bg][{highlight_input_idx}:v]overlay=(W-w)/2:-300[bg_complete]")
        
        current_layer = "bg_complete"
        
        # Add optional user image above text (if provided)
        # Image specs: max 1000px wide, 1600px tall, centered, 40px spacing above text
        if image_path:
            # Scale image to fit within 1000x1600 while maintaining aspect ratio
            filter_parts.append(f"[{image_input_idx}:v]scale=w='min(1000,iw)':h='min(1600,ih)':force_original_aspect_ratio=decrease[scaled_image]")
            # Position image centered horizontally, positioned higher up on screen
            # Y position: (1080 - 1600) / 2 would be negative, so let's position at y=50 to allow tall images
            filter_parts.append(f"[{current_layer}][scaled_image]overlay=(W-w)/2:50[with_image]")
            current_layer = "with_image"
        
        # Add text overlay if available
        if has_overlay and overlay_path:
            # Position text overlay
            # If image exists, position text lower (to account for image + 40px spacing)
            # Otherwise, center text as before
            if image_path:
                # Position text below image: image is at y=50, max height 1600, so image bottom could be at 1650
                # This would go off screen (1080px), so text needs to be positioned dynamically
                # Let's position at y=700 to be safe for most image sizes
                overlay_y = 700
            else:
                # Center text overlay (no image)
                overlay_y = 365  # Center vertically as before
            
            overlay_x = 460  # Center horizontally: (1920 - 1000) / 2 = 460px
            filter_parts.append(f"[{current_layer}][{overlay_input_idx}:v]overlay={overlay_x}:{overlay_y}[final]")
            current_layer = "final"
        else:
            # No text overlay, rename current layer to final
            filter_parts.append(f"[{current_layer}]copy[final]")
        
        # Build FFmpeg command
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        
        # Add all inputs
        for input_args in inputs:
            cmd.extend(input_args)
        
        # Add filter complex
        cmd.extend([
            "-filter_complex", ";".join(filter_parts),
            "-map", "[final]",                     # Use final video output
            "-map", f"{audio_input_idx}:a",        # Use audio from audio input
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
        ])
        
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


