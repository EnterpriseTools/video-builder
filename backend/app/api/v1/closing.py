import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.closing_overlay import ClosingOverlayGenerator
from app.utils import get_audio_duration, extract_audio_from_media

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
        
        # Build FFmpeg command with closing specific styling (audio + text overlay only)
        filter_parts = []
        
        # Create background with standard color scheme
        bg_color = "0x0C090E"  # Standard background color (#0C090E)
        
        # Create main background canvas (no image, just background)
        filter_parts.append(f"color=c={bg_color}:size=1920x1080:duration={audio_duration}:rate=30[bg]")
        
        # Add Wave.png overlay with color correction to neutralize blue tinting
        # Using Vercel CDN URL instead of local file path
        wave_path = "https://video-builder-nu.vercel.app/Wave.png"
        
        # Scale the wave to match announcement template sizing: width 120% of viewport (2304px wide)
        wave_width = 2304  # 120% of 1920px
        filter_parts.append(f"[0:v]scale={wave_width}:-1[scaled_wave]")
        
        # Wave positioning - no outro animation, stays visible throughout
        # Use numeric values to avoid FFmpeg hanging - wave is typically ~700px high
        wave_x = -192  # -10% of 1920px width
        wave_y = 730  # Position: show about 50% of wave image
        
        wave_overlay = f"[bg][scaled_wave]overlay={wave_x}:{wave_y}[wave_bg]"
        
        filter_parts.append(wave_overlay)
        
        # Add Highlight.png overlay (same positioning as announcement template)
        # Using Vercel CDN URL instead of local file path
        highlight_path = "https://video-builder-nu.vercel.app/highlight.png"
        
        # Scale highlight to original size (no scaling - same as announcement)
        filter_parts.append(f"[1:v]scale=iw:ih[scaled_highlight]")
        
        # Highlight positioning - no outro animation, stays visible throughout
        # Position: top-aligned, horizontally centered (same as announcement)
        # Use numeric values to avoid FFmpeg hanging - highlight is typically ~1000px wide
        highlight_x = 460  # Center horizontally: (1920 - 1000) / 2 = 460px
        highlight_y = -100  # Position: partially visible at top
        
        highlight_overlay = f"[wave_bg][scaled_highlight]overlay={highlight_x}:{highlight_y}[highlight_video]"
        
        filter_parts.append(highlight_overlay)
        
        if has_overlay and overlay_path:
            # Calculate overlay timing - show for most of the video duration
            overlay_start = 0.6  # Start 0.6s into video
            overlay_end = max(1.0, audio_duration - 0.5)  # End 0.5s before video ends
            
            # Position the overlay centered (simplified - no animation)
            overlay_x = 560  # Center horizontally: (1920 - 800) / 2 = 560px
            overlay_y = 340  # Center vertically: (1080 - 400) / 2 = 340px
            
            # Ultra-simple static text overlay - no enable parameter
            overlay_filter = f"[highlight_video][2:v]overlay={overlay_x}:{overlay_y}[final]"
            
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with overlay
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", str(wave_path),   # Input Wave.png (0)
                "-loop", "1", "-i", str(highlight_path), # Input highlight.png (1)
                "-i", str(overlay_path),               # Input overlay PNG (2)
                "-i", str(audio_path),                 # Input audio (3)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[final]",                     # Use final video output
                "-map", "3:a",                         # Use audio from fourth input
                "-c:v", "libx264",
                "-c:a", "aac",
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        else:
            # No text overlay - just wave + highlight + audio with background
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", str(wave_path),   # Input Wave.png (0)
                "-loop", "1", "-i", str(highlight_path), # Input highlight.png (1)
                "-i", str(audio_path),                 # Input audio (2)
                "-filter_complex", ";".join(filter_parts),  # Use highlight_video as final
                "-map", "[highlight_video]",           # Use highlight_video as final
                "-map", "2:a",                         # Use audio from third input
                "-c:v", "libx264", 
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


