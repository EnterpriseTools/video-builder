import tempfile
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.utils.file_utils import cleanup_temp_path
from app.utils.media import get_video_duration
from app.utils.watermark_overlay import apply_watermark_to_video

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/concatenate/test")
async def test_concatenate_endpoint():
    """Test endpoint to verify concatenate router is working"""
    return {"status": "ok", "message": "Concatenate endpoint is reachable"}

class VideoSegment(BaseModel):
    """Represents a video segment to be concatenated"""
    order: int
    video_data: bytes
    filename: str

class ConcatenateRequest(BaseModel):
    """Request model for video concatenation"""
    segments: List[Dict[str, Any]]
    final_filename: str = "presentation-final.mp4"

@router.post("/concatenate")
async def concatenate_videos(background_tasks: BackgroundTasks, request: ConcatenateRequest):
    """
    Concatenate multiple video segments into a single final video.
    
    Args:
        request: Contains video segments and final filename
        
    Returns:
        Final concatenated video file
    """
    
    if not request.segments:
        raise HTTPException(status_code=400, detail="No video segments provided")
    
    # Create temporary directory for processing
    temp_dir = Path(tempfile.mkdtemp(prefix="concatenate_"))
    
    try:
        # Sort segments by order
        sorted_segments = sorted(request.segments, key=lambda x: x.get('order', 0))
        
        # Save all video segments to temporary files
        segment_paths = []
        segment_metadata = []
        concat_list_path = temp_dir / "concat_list.txt"
        
        with open(concat_list_path, 'w') as concat_file:
            for i, segment in enumerate(sorted_segments):
                if 'video_data' not in segment:
                    continue
                    
                # Create temporary file for this segment
                segment_filename = f"segment_{i:02d}.mp4"
                segment_path = temp_dir / segment_filename
                
                # Write video data to file
                with open(segment_path, 'wb') as f:
                    # Handle base64 encoded data if needed
                    video_data = segment['video_data']
                    if isinstance(video_data, str):
                        import base64
                        video_data = base64.b64decode(video_data)
                    f.write(video_data)
                
                segment_paths.append(segment_path)
                # Add to FFmpeg concat list
                concat_file.write(f"file '{segment_path}'\n")
                
                # Record metadata for duration tracking
                duration = None
                try:
                    duration = get_video_duration(segment_path)
                    logger.debug(f"Segment order {segment['order']} duration: {duration:.3f}s")
                except Exception as exc:
                    logger.warning(f"Failed to read duration for segment {segment_path}: {exc}")
                segment_metadata.append({
                    "order": segment['order'],
                    "path": segment_path,
                    "duration": duration
                })
        
        if not segment_paths:
            raise HTTPException(status_code=400, detail="No valid video segments found")
        
        # Create output path
        output_filename = request.final_filename
        if not output_filename.endswith('.mp4'):
            output_filename += '.mp4'
        output_path = temp_dir / output_filename
        
        # FFmpeg command to concatenate videos
        # Using concat demuxer for frame-perfect concatenation
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list_path),
            "-c", "copy",  # Copy streams without re-encoding for speed
            "-avoid_negative_ts", "make_zero",
            str(output_path)
        ]
        
        print(f"Running FFmpeg concatenation command: {' '.join(cmd)}")
        
        # Use Popen to avoid subprocess deadlock on large outputs
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion with timeout
            stdout, stderr = process.communicate(timeout=120)  # Longer timeout for concatenation
            
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
            logger.error(f"FFmpeg concatenation timed out for {temp_dir}. Last output: {stderr[-500:]}")
            raise HTTPException(
                status_code=500,
                detail="FFmpeg concatenation timed out after 120 seconds"
            )
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            print(f"FFmpeg stdout: {result.stdout}")
            cleanup_temp_path(temp_dir)  # Immediate cleanup on FFmpeg failure
            logger.error(f"FFmpeg concatenation failed for {temp_dir}: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Video concatenation failed: {result.stderr}"
            )
        
        if not output_path.exists():
            cleanup_temp_path(temp_dir)  # Immediate cleanup on missing output
            raise HTTPException(status_code=500, detail="Output video file was not created")
        
        print(f"Successfully concatenated {len(segment_paths)} videos into {output_path}")
        
        # Schedule cleanup AFTER FileResponse finishes streaming
        background_tasks.add_task(cleanup_temp_path, temp_dir)
        
        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="video/mp4"
        )
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"FFmpeg command failed: {e.stderr}")
    except Exception as e:
        # Defensive cleanup on any other exception
        cleanup_temp_path(temp_dir)
        logger.exception(f"Unexpected error during concatenation for {temp_dir}")
        raise HTTPException(status_code=500, detail=f"Failed to concatenate videos: {str(e)}")


@router.post("/concatenate-multipart")
async def concatenate_videos_multipart(
    background_tasks: BackgroundTasks,
    segment_0: Optional[UploadFile] = File(None),
    segment_1: Optional[UploadFile] = File(None),
    segment_2: Optional[UploadFile] = File(None),
    segment_3: Optional[UploadFile] = File(None),
    segment_4: Optional[UploadFile] = File(None),
    segment_5: Optional[UploadFile] = File(None),
    order_0: str = Form("0"),
    order_1: str = Form("1"), 
    order_2: str = Form("2"),
    order_3: str = Form("3"),
    order_4: str = Form("4"),
    order_5: str = Form("5"),
    final_filename: str = Form("presentation-final"),
    team_name: str = Form("")  # Team name for watermark
):
    """
    Concatenate videos using multipart form data.
    Accepts up to 6 video segments (matching the 6 templates).
    Applies Axon body camera watermark to final video.
    """
    
    print(f"DEBUG: Concatenation request received. final_filename: {final_filename}, team_name: {team_name}")
    print(f"DEBUG: Orders: {[order_0, order_1, order_2, order_3, order_4, order_5]}")
    
    # Collect all uploaded segments
    segments = []
    segment_files = [segment_0, segment_1, segment_2, segment_3, segment_4, segment_5]
    orders = [order_0, order_1, order_2, order_3, order_4, order_5]
    
    for i, (segment_file, order) in enumerate(zip(segment_files, orders)):
        if segment_file and segment_file.filename:
            print(f"DEBUG: Found segment {i}: {segment_file.filename}, order: {order}")
            segments.append({
                'file': segment_file,
                'order': int(order),
                'index': i
            })
        else:
            print(f"DEBUG: Segment {i} is None or has no filename")
    
    print(f"DEBUG: Total segments collected: {len(segments)}")
    
    if not segments:
        raise HTTPException(status_code=400, detail="No video segments provided")
    
    # Sort segments by order
    segments.sort(key=lambda x: x['order'])
    
    # Create temporary directory for processing
    temp_dir = Path(tempfile.mkdtemp(prefix="concatenate_mp_"))
    
    try:
        # Save segments and create concat list
        segment_paths = []
        segment_metadata = []
        concat_list_path = temp_dir / "concat_list.txt"
        
        with open(concat_list_path, 'w') as concat_file:
            for i, segment in enumerate(segments):
                segment_filename = f"segment_{segment['order']:02d}.mp4"
                segment_path = temp_dir / segment_filename
                
                # Write video data
                content = await segment['file'].read()
                with open(segment_path, 'wb') as f:
                    f.write(content)
                
                segment_paths.append(segment_path)
                concat_file.write(f"file '{segment_path}'\n")
                
                duration = None
                try:
                    duration = get_video_duration(segment_path)
                    logger.debug(f"[multipart] Segment order {segment['order']} duration: {duration:.3f}s")
                except Exception as exc:
                    logger.warning(f"[multipart] Failed to read duration for segment {segment_path}: {exc}")
                segment_metadata.append({
                    "order": segment['order'],
                    "path": segment_path,
                    "duration": duration
                })
        
        # Create output path
        output_filename = final_filename
        if not output_filename.endswith('.mp4'):
            output_filename += '.mp4'
        output_path = temp_dir / output_filename
        
        # FFmpeg concatenation command with proper encoding settings
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat",
            "-safe", "0", 
            "-i", str(concat_list_path),
            "-c:v", "libx264",
            "-preset", "fast",  # Good balance of speed/quality (restored from ultrafast)
            "-crf", "23",  # Standard high quality (restored from 28)
            "-c:a", "aac",
            "-b:a", "192k",  # Better audio quality
            "-ar", "48000",  # Consistent 48 kHz audio
            "-ac", "2",  # Force stereo audio (normalize all segments)
            "-vsync", "cfr",  # Constant frame rate for proper sync
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",  # Optimize for web playback
            str(output_path)
        ]
        
        print(f"Running FFmpeg concatenation: {' '.join(cmd)}")
        
        # Use Popen to avoid subprocess deadlock on large outputs
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion with timeout
            stdout, stderr = process.communicate(timeout=120)  # Longer timeout for concatenation
            
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
            logger.error(f"FFmpeg concatenation timed out for {temp_dir}. Last output: {stderr[-500:]}")
            raise HTTPException(
                status_code=500,
                detail="FFmpeg concatenation timed out after 120 seconds"
            )
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            cleanup_temp_path(temp_dir)  # Immediate cleanup on FFmpeg failure
            logger.error(f"FFmpeg concatenation failed for {temp_dir}: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Video concatenation failed: {result.stderr}"
            )
        
        if not output_path.exists():
            cleanup_temp_path(temp_dir)  # Immediate cleanup on missing output
            raise HTTPException(status_code=500, detail="Output video was not created")
        
        print(f"Successfully concatenated {len(segment_paths)} videos into {output_filename}")
        
        # Calculate QR overlay intervals (intro start, closing end)
        qr_intervals = []
        total_segment_duration = sum(
            meta["duration"] for meta in segment_metadata if meta["duration"] is not None
        )
        final_video_duration = None
        try:
            final_video_duration = get_video_duration(output_path)
        except Exception as exc:
            logger.warning(f"Unable to read final video duration for QR overlay: {exc}")
            if total_segment_duration:
                final_video_duration = total_segment_duration
        
        def find_duration(order: int) -> Optional[float]:
            for meta in segment_metadata:
                if meta["order"] == order and meta["duration"]:
                    return meta["duration"]
            return None
        
        intro_duration = find_duration(1)
        closing_duration = find_duration(6)
        
        if intro_duration:
            qr_intervals.append((0.0, intro_duration))
        
        if closing_duration and final_video_duration:
            closing_start = max(0.0, final_video_duration - closing_duration)
            qr_intervals.append((closing_start, final_video_duration))
        
        logger.info(f"QR overlay intervals calculated: {qr_intervals}")
        
        # Apply watermark to the concatenated video
        try:
            watermarked_filename = f"{Path(output_filename).stem}_watermarked.mp4"
            watermarked_path = temp_dir / watermarked_filename
            
            apply_watermark_to_video(
                input_video_path=output_path,
                output_video_path=watermarked_path,
                team_name=team_name,
                qr_overlay_intervals=qr_intervals
            )
            
            if not watermarked_path.exists():
                logger.warning("Watermark application failed, returning original video")
                watermarked_path = output_path
            else:
                output_path = watermarked_path
                
        except Exception as e:
            logger.error(f"Watermark application error: {str(e)}")
            # Continue with original video if watermark fails
        
        # Schedule cleanup AFTER FileResponse finishes streaming
        background_tasks.add_task(cleanup_temp_path, temp_dir)
        
        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="video/mp4"
        )
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"FFmpeg failed: {str(e)}")
    except Exception as e:
        # Defensive cleanup on any other exception
        cleanup_temp_path(temp_dir)
        logger.exception(f"Unexpected error during concatenation-multipart for {temp_dir}")
        raise HTTPException(status_code=500, detail=f"Concatenation failed: {str(e)}")
