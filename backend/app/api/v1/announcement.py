import tempfile
import subprocess
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
        
        # Build FFmpeg command
        filter_parts = []
        
        # Create background with standard color scheme
        bg_color = "0x0C090E"  # Standard background color (#0C090E)
        container_color = "0x1F1D23"  # Image container background color (only for frontend preview)
        
        # Calculate dimensions: 50% width = 960px, with 32px padding = 896px usable width, 1016px usable height (32px top/bottom)
        container_width = 960
        container_height = 1080
        padding = 32
        usable_width = container_width - (padding * 2)  # 896px
        usable_height = container_height - (padding * 2)  # 1016px
        
        # Scale image to fit within the padded area while maintaining aspect ratio and transparency
        filter_parts.append(f"[0:v]scale={usable_width}:{usable_height}:force_original_aspect_ratio=decrease[scaled_image]")
        
        # Pad the scaled image to center it within the container area with transparent background
        # The final container will be 960x1080 to position on the right half
        # Center the image within the full container (960x1080) with proper padding
        filter_parts.append(f"[scaled_image]pad={container_width}:{container_height}:({container_width}-iw)/2:({container_height}-ih)/2:color=0x00000000[final_container]")
        
        # Create main background canvas
        filter_parts.append(f"color=c={bg_color}:size=1920x1080:duration={audio_duration}:rate=30[bg]")
        
        # Calculate animation timing for image container
        image_slide_in_start = 0.3  # Start sliding in at 0.3s
        image_slide_in_end = 0.9    # Finish sliding in at 0.9s (0.6s animation)
        image_slide_out_start = max(1.0, audio_duration - 0.5)  # Start sliding out 500ms before end
        image_slide_out_end = audio_duration  # Finish sliding out at end
        
        # Animate the image container sliding in from right and out to right
        # Start position: x=1920 (off-screen to the right)
        # Final position: x=960 (right half of screen)
        image_start_x = 1920  # Completely off-screen to the right
        image_final_x = 960   # Right half position
        
        # Add Wave.png overlay FIRST (lowest z-index - behind everything)
        wave_path = Path(__file__).parent.parent.parent.parent.parent / "frontend" / "public" / "Wave.png"
        wave_slide_start = 0.1  # Start wave animation right away
        wave_slide_end = wave_slide_start + 0.5  # 500ms faster slide up animation
        
        # First scale the wave to match CSS sizing: width 120% of viewport (2304px wide)
        wave_width = 2304  # 120% of 1920px
        filter_parts.append(f"[2:v]scale={wave_width}:-1[scaled_wave]")
        
        # Wave animation: slides up from bottom and stays visible (applied to background first)
        # Position: left=-10%, bottom=-30% (matches CSS positioning - lowered by 20%)
        wave_start_x = "-192"  # -10% of 1920px width
        wave_final_x = "-192"  # Same x position throughout
        wave_start_y = "H"  # Start completely below screen
        wave_final_y = "H-h*0.5"  # Final position: show 65% of wave, 35% below viewport (lowered by 20%)
        wave_overlay = f"[bg][scaled_wave]overlay=x={wave_final_x}:y='if(between(t,{wave_slide_start},{wave_slide_end}), {wave_start_y} + (({wave_final_y})-({wave_start_y})) * pow((t-{wave_slide_start})/{wave_slide_end-wave_slide_start}, 0.6), {wave_final_y})':enable=gte(t\\,{wave_slide_start})[wave_bg]"
        
        filter_parts.append(wave_overlay)
        
        # Create animated overlay for the image container with easing (on top of wave)
        animated_overlay = f"[wave_bg][final_container]overlay=x='if(between(t,{image_slide_in_start},{image_slide_in_end}), {image_start_x} + ({image_final_x}-{image_start_x}) * pow((t-{image_slide_in_start})/{image_slide_in_end-image_slide_in_start}, 0.5), if(between(t,{image_slide_in_end},{image_slide_out_start}), {image_final_x}, if(between(t,{image_slide_out_start},{image_slide_out_end}), {image_final_x} + ({image_start_x}-{image_final_x}) * pow((t-{image_slide_out_start})/{image_slide_out_end-image_slide_out_start}, 2), {image_start_x})))':y=0[base_video]"
        
        filter_parts.append(animated_overlay)
        
        # Add Highlight.png overlay (same z-index as wave, slides from top)
        highlight_path = Path(__file__).parent.parent.parent.parent.parent / "frontend" / "public" / "highlight.png"
        highlight_slide_start = 0.2  # Start highlight animation slightly after wave
        highlight_slide_end = highlight_slide_start + 0.6  # 600ms slide down animation
        
        # Scale highlight to original size (no scaling)
        filter_parts.append(f"[3:v]scale=iw:ih[scaled_highlight]")
        
        # Highlight animation: slides down from top and stays visible
        # Position: top-aligned, horizontally centered (percentage-based for easy tweaking)
        highlight_start_x = "W*0.5-w*0.5"  # Center horizontally (50% of viewport - 50% of image)
        highlight_final_x = "W*0.5-w*0.5"  # Same x position throughout
        highlight_start_y = "-h"  # Start completely above screen
        highlight_final_y = "H*-0.3"    # Final position: top-aligned (0% from top)
        highlight_overlay = f"[base_video][scaled_highlight]overlay=x={highlight_final_x}:y='if(between(t,{highlight_slide_start},{highlight_slide_end}), {highlight_start_y} + ({highlight_final_y}-({highlight_start_y})) * pow((t-{highlight_slide_start})/{highlight_slide_end-highlight_slide_start}, 0.6), {highlight_final_y})':enable=gte(t\\,{highlight_slide_start})[highlight_video]"
        
        filter_parts.append(highlight_overlay)
        
        if has_overlay and overlay_path:
            # Calculate overlay timing - show for most of the video duration
            overlay_start = 0.5  # Start 0.5s into video
            overlay_end = max(1.0, audio_duration - 0.5)  # End 0.5s before video ends
            
            # Create sliding animation for text overlay (slide up from 100px below final position)
            text_slide_in_start = 0.5  # Start text animation slightly after image (0.5s)
            text_slide_in_end = text_slide_in_start + 0.6  # 600ms slide up animation
            text_slide_out_start = overlay_end - 0.3  # Start sliding out 300ms before end (faster exit)
            text_slide_out_end = overlay_end
            
            # Position the overlay on the left side (since image is on right)
            overlay_x = "100"  # Position from left edge with some margin
            overlay_y_final = "(H-h)/2"  # Center vertically
            overlay_y_start = f"(H-h)/2+100"  # Start position: 100px below final position
            
            # Use the working slide animation - it provides great visual impact
            # The smooth slide up/down animation matches the frontend perfectly
            overlay_filter = f"""[highlight_video][1:v]overlay=x={overlay_x}:y='if(between(t,{text_slide_in_start},{text_slide_in_end}), {overlay_y_start} + ({overlay_y_final}-({overlay_y_start})) * pow((t-{text_slide_in_start})/{text_slide_in_end-text_slide_in_start}, 0.7), if(between(t,{text_slide_in_end},{text_slide_out_start}), {overlay_y_final}, if(between(t,{text_slide_out_start},{text_slide_out_end}), {overlay_y_final} + ({overlay_y_start}-({overlay_y_final})) * pow((t-{text_slide_out_start})/{text_slide_out_end-text_slide_out_start}, 1.5), {overlay_y_start})))':enable=between(t\\,{text_slide_in_start}\\,{text_slide_out_end})[final]"""
            
            filter_parts.append(overlay_filter)
            
            # FFmpeg command with overlay
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", str(image_path),  # Input image (0)
                "-i", str(overlay_path),               # Input overlay PNG (1)
                "-loop", "1", "-i", str(wave_path),   # Input Wave.png (2)
                "-loop", "1", "-i", str(highlight_path), # Input highlight.png (3)
                "-i", str(audio_path),                 # Input audio (4)
                "-filter_complex", ";".join(filter_parts),
                "-map", "[final]",                     # Use final video output
                "-map", "4:a",                         # Use audio from fifth input
                "-c:v", "libx264",
                "-c:a", "aac",
                "-t", str(audio_duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
        else:
            # No text overlay - just image + wave + highlight + audio with background
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", str(image_path),  # Input image (0)
                "-loop", "1", "-i", str(wave_path),   # Input Wave.png (1)
                "-loop", "1", "-i", str(highlight_path), # Input highlight.png (2)
                "-i", str(audio_path),                 # Input audio (3)
                "-filter_complex", ";".join(filter_parts),  # Use highlight_video as final
                "-map", "[highlight_video]",           # Use highlight_video as final
                "-map", "3:a",                         # Use audio from fourth input
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


