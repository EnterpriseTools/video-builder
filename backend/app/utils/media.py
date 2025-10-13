"""
Media utility functions for video and audio processing.
"""
import subprocess
from pathlib import Path
from typing import Union


def get_media_duration(media_path: Union[str, Path], fallback_duration: float = 10.0) -> float:
    """
    Get the duration of a media file (audio or video) using FFprobe.
    
    Args:
        media_path: Path to the media file
        fallback_duration: Duration to return if extraction fails (default: 10.0)
        
    Returns:
        Duration in seconds as float
        
    Raises:
        RuntimeError: If fallback_duration is None and extraction fails
    """
    try:
        cmd = [
            "ffprobe", "-v", "quiet", 
            "-show_entries", "format=duration", 
            "-of", "csv=p=0", 
            str(media_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            duration = float(result.stdout.strip())
            return duration
        else:
            error_msg = f"ffprobe failed for {media_path}: {result.stderr}"
            if fallback_duration is not None:
                print(error_msg)
                return fallback_duration
            else:
                raise RuntimeError(error_msg)
                
    except ValueError as e:
        error_msg = f"Failed to parse duration for {media_path}: {e}"
        if fallback_duration is not None:
            print(error_msg)
            return fallback_duration
        else:
            raise RuntimeError(error_msg)
            
    except Exception as e:
        error_msg = f"Error getting duration for {media_path}: {e}"
        if fallback_duration is not None:
            print(error_msg)
            return fallback_duration
        else:
            raise RuntimeError(error_msg)


def get_audio_duration(audio_path: Union[str, Path]) -> float:
    """
    Get duration of audio file using ffprobe.
    Returns 10.0 seconds as fallback on error.
    """
    return get_media_duration(audio_path, fallback_duration=10.0)


def get_video_duration(video_path: Union[str, Path]) -> float:
    """
    Get duration of video file using ffprobe.
    Raises RuntimeError on failure (no fallback).
    """
    return get_media_duration(video_path, fallback_duration=None)


async def extract_audio_from_media(media_path: Path, temp_dir: Path) -> Path:
    """
    Extract audio from media file (works for both audio and video files).
    
    If the input is a video file (.mov, .mp4), extracts the audio track to WAV format.
    If the input is already an audio file, returns the original path unchanged.
    
    Args:
        media_path: Path to the media file (audio or video)
        temp_dir: Directory where extracted audio should be saved
        
    Returns:
        Path to audio file (either extracted or original)
        
    Note:
        Falls back gracefully to original file if extraction fails.
    """
    # Determine if it's a video file that needs audio extraction
    file_extension = media_path.suffix.lower()
    is_video_file = file_extension in ['.mov', '.mp4'] or media_path.name.lower().endswith(('.mov', '.mp4'))
    
    if is_video_file:
        # Extract audio from video file
        audio_path = temp_dir / f"extracted_audio.wav"
        
        cmd = [
            "ffmpeg", "-y",
            "-i", str(media_path),
            "-vn",  # No video
            "-acodec", "pcm_s16le",  # Use WAV format for compatibility
            "-ar", "44100",  # Sample rate
            "-ac", "2",  # Stereo
            str(audio_path)
        ]
        
        print(f"Extracting audio from video: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Audio extraction failed: {result.stderr}")
            # If extraction fails, try to use the original file anyway
            return media_path
        
        if not audio_path.exists():
            print("Audio extraction created no output file, using original")
            return media_path
            
        print(f"Audio extracted successfully to: {audio_path}")
        return audio_path
    else:
        # It's already an audio file, use as-is
        return media_path
