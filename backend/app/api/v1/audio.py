import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ...core.config import settings
from ...utils.audio_enhancer import AudioEnhancerConfig, enhance_audio
from ...utils.file_utils import cleanup_temp_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio", tags=["audio"])


def _validate_upload(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    if file.content_type and not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {file.content_type}")


@router.post("/enhance")
async def enhance_audio_route(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
):
    """
    Enhance an uploaded recording by passing it through AssemblyAI + FFmpeg.
    """
    if not settings.FEATURE_AUDIO_ENHANCE:
        raise HTTPException(status_code=503, detail="Audio enhancement is currently disabled")

    _validate_upload(audio)

    config = AudioEnhancerConfig(
        api_key=settings.ASSEMBLYAI_API_KEY,
        base_url=settings.ASSEMBLYAI_BASE_URL,
        rnnoise_model_path=settings.AUDIO_RNNOISE_MODEL_PATH,
    )

    try:
        result = await enhance_audio(audio, config)
    except FileNotFoundError as err:
        logger.error("RNNoise model missing: %s", err)
        raise HTTPException(status_code=500, detail=str(err)) from err
    except TimeoutError as err:
        logger.error("AssemblyAI timeout: %s", err)
        raise HTTPException(status_code=504, detail=str(err)) from err
    except HTTPException:
        raise
    except Exception as err:
        logger.exception("Failed to enhance audio: %s", err)
        raise HTTPException(status_code=502, detail=str(err)) from err

    background_tasks.add_task(cleanup_temp_path, result.temp_dir)

    output_filename = f"enhanced-{Path(audio.filename).stem}.webm"
    headers = {
        "X-Audio-Duration": str(result.duration_ms / 1000),
        "X-Audio-Enhancements": ",".join(result.metadata.get("enhancements", [])),
    }
    transcript_id = result.metadata.get("transcript_id")
    if transcript_id:
        headers["X-Audio-Transcript-Id"] = transcript_id

    return FileResponse(
        path=result.output_path,
        filename=output_filename,
        media_type="audio/webm",
        headers=headers,
    )

