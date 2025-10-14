import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.utils.how_it_works_overlay import HowItWorksOverlayGenerator
from app.utils import get_audio_duration, extract_audio_from_media

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
        
        # Build FFmpeg command with how-it-works specific styling (audio + text overlay only)
        filter_parts = []
        
        # Create background with standard color scheme
        bg_color = "0x0C090E"  # Standard background color (#0C090E)
        
        # Create main background canvas (no image, just background)
        filter_parts.append(f"color=c={bg_color}:size=1920x1080:duration={audio_duration}:rate=30[bg]")
        
        # Add Wave.png overlay FIRST (lowest z-index - behind everything)
        # Same positioning as announcement template but without intro animation
        wave_path = Path(__file__).parent.parent.parent.parent.parent / "frontend" / "public" / "Wave.png"
        
        # Scale the wave to match announcement template sizing: width 120% of viewport (2304px wide)
        wave_width = 2304  # 120% of 1920px
        filter_parts.append(f"[0:v]scale={wave_width}:-1[scaled_wave]")
        
        # Calculate outro timing for wave and highlight animations (500ms before end)
        wave_outro_start = max(1.0, audio_duration - 0.5)  # Start outro 500ms before end
        wave_outro_end = audio_duration  # End of video
        
        # Wave positioning with outro animation: slides down at the end
        # Position: left=-10%, bottom=-30% (matches announcement CSS positioning)
        wave_x = "-192"  # -10% of 1920px width
        wave_y_normal = "H-h*0.5"  # Normal position: show 65% of wave, 35% below viewport
        wave_y_outro = "H+100"  # Outro position: completely below viewport
        
        # Simplified wave overlay with linear interpolation
        wave_y_expr = f"if(lt(t,{wave_outro_start}),{wave_y_normal},if(lt(t,{wave_outro_end}),{wave_y_normal}+({wave_y_outro}-{wave_y_normal})*(t-{wave_outro_start})/{wave_outro_end-wave_outro_start},{wave_y_outro}))"
        wave_overlay = f"[bg][scaled_wave]overlay=x={wave_x}:y='{wave_y_expr}':enable=lte(t\\,{audio_duration})[wave_bg]"
        
        filter_parts.append(wave_overlay)
        
        # Add Highlight.png overlay (same positioning as announcement template)
        highlight_path = Path(__file__).parent.parent.parent.parent.parent / "frontend" / "public" / "highlight.png"
        
        # Scale highlight to original size (no scaling - same as announcement)
        filter_parts.append(f"[1:v]scale=iw:ih[scaled_highlight]")
        
        # Highlight positioning with outro animation: slides up at the end
        # Position: top-aligned, horizontally centered (same as announcement)
        highlight_x = "W*0.5-w*0.5"  # Center horizontally (50% of viewport - 50% of image)
        highlight_y_normal = "H*-0.3"    # Normal position: top-aligned (same as announcement)
        highlight_y_outro = "H*-0.8"  # Outro position: further up and out of view
        
        # Simplified highlight overlay with linear interpolation
        highlight_y_expr = f"if(lt(t,{wave_outro_start}),{highlight_y_normal},if(lt(t,{wave_outro_end}),{highlight_y_normal}+({highlight_y_outro}-{highlight_y_normal})*(t-{wave_outro_start})/{wave_outro_end-wave_outro_start},{highlight_y_outro}))"
        highlight_overlay = f"[wave_bg][scaled_highlight]overlay=x={highlight_x}:y='{highlight_y_expr}':enable=lte(t\\,{audio_duration})[highlight_video]"
        
        filter_parts.append(highlight_overlay)
        
        if has_overlay and overlay_path:
            # Calculate overlay timing - show for most of the video duration
            overlay_start = 0.6  # Start 0.6s into video (slightly later than announcement)
            overlay_end = max(1.0, audio_duration - 0.5)  # End 0.5s before video ends
            
            # Create sliding animation for text overlay
            text_slide_in_start = 0.6  # Start text animation 0.6s
            text_slide_in_end = text_slide_in_start + 0.7  # 700ms slide up animation
            text_slide_out_start = overlay_end - 0.4  # Start sliding out 400ms before end
            text_slide_out_end = overlay_end
            
            # Position the overlay centered (no image to work around)
            overlay_x = "(W-w)/2"  # Center horizontally
            overlay_y_final = "(H-h)/2"  # Center vertically
            overlay_y_start = f"(H-h)/2+120"  # Start position: 120px below final position
            
            # Simplified text overlay with linear interpolation for better FFmpeg compatibility
            text_y_expr = f"if(lt(t,{text_slide_in_start}),{overlay_y_start},if(lt(t,{text_slide_in_end}),{overlay_y_start}+({overlay_y_final}-{overlay_y_start})*(t-{text_slide_in_start})/{text_slide_in_end-text_slide_in_start},if(lt(t,{text_slide_out_start}),{overlay_y_final},if(lt(t,{text_slide_out_end}),{overlay_y_final}+({overlay_y_start}-{overlay_y_final})*(t-{text_slide_out_start})/{text_slide_out_end-text_slide_out_start},{overlay_y_start}))))"
            overlay_filter = f"[highlight_video][2:v]overlay=x={overlay_x}:y='{text_y_expr}':enable=between(t\\,{text_slide_in_start}\\,{text_slide_out_end})[final]"
            
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with overlay (no image input)
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


