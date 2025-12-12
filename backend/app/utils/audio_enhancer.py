"""
Utilities for the /audio/enhance workflow.

The enhancer normalizes uploaded recordings, sends them to AssemblyAI for
disfluency/pause detection, denoises with RNNoise + loudness normalization, and
removes filler ranges before exporting a WebM (Opus) blob that the frontend can
reuse everywhere in TakeOne.
"""
from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

import httpx
from fastapi import UploadFile
from pydub import AudioSegment

logger = logging.getLogger(__name__)

# Default filler tokens that feel natural to trim
DEFAULT_FILLER_TERMS: Tuple[str, ...] = (
    "um",
    "uh",
    "uhh",
    "uhm",
    "er",
    "ah",
    "like",
    "you know",
    "kind of",
    "sort of",
)


@dataclass
class AudioEnhancerConfig:
    api_key: str
    base_url: str
    rnnoise_model_path: str
    filler_terms: Sequence[str] = DEFAULT_FILLER_TERMS
    pause_gap_ms: int = 600
    poll_interval: float = 2.0
    poll_timeout: float = 180.0


@dataclass
class EnhancedAudioResult:
    output_path: Path
    duration_ms: int
    temp_dir: Path
    metadata: dict


async def enhance_audio(upload_file: UploadFile, config: AudioEnhancerConfig) -> EnhancedAudioResult:
    """
    Entry point used by the FastAPI route. Raises RuntimeError/HTTPException-compatible
    errors so the caller can translate them into responses.
    """
    if not config.api_key:
        raise RuntimeError("ASSEMBLYAI_API_KEY is not configured")

    rnnoise_path = Path(config.rnnoise_model_path)
    if not rnnoise_path.exists():
        raise FileNotFoundError(
            f"RNNoise model was not found at {rnnoise_path}. "
            "Download a .rnnn model (see backend/app/assets/audio/README.md) "
            "or update AUDIO_RNNOISE_MODEL_PATH."
        )

    temp_dir = Path(tempfile.mkdtemp(prefix="enhance_"))
    logger.debug("Created temp directory for audio enhance: %s", temp_dir)

    try:
        source_path = temp_dir / (upload_file.filename or "takeone-audio.webm")
        await asyncio.to_thread(_write_upload_to_path, upload_file, source_path)

        normalized_path = temp_dir / "normalized.wav"
        await _run_ffmpeg(
            [
                "-y",
                "-i",
                str(source_path),
                "-ac",
                "1",
                "-ar",
                "48000",
                str(normalized_path),
            ],
            description="normalize audio",
        )

        transcript = await _transcribe_with_assemblyai(normalized_path, config)

        denoised_path = temp_dir / "denoised.wav"
        # Quote the RNNoise path because repo directories can contain spaces.
        safe_model_path = str(rnnoise_path).replace("'", r"'\''")
        ffmpeg_filters = f"arnndn=m='{safe_model_path}',loudnorm=I=-20:TP=-3:LRA=11"
        await _run_ffmpeg(
            [
                "-y",
                "-i",
                str(normalized_path),
                "-af",
                ffmpeg_filters,
                "-ac",
                "1",
                "-ar",
                "48000",
                str(denoised_path),
            ],
            description="denoise and normalize",
            timeout=180,
        )

        ranges_ms = build_reduction_ranges(
            transcript_words=transcript.get("words") or [],
            filler_terms=config.filler_terms,
            pause_gap_ms=config.pause_gap_ms,
        )

        export_path = temp_dir / "enhanced.webm"
        duration_ms = await asyncio.to_thread(
            _strip_and_export,
            denoised_path,
            ranges_ms,
            export_path,
        )

        metadata = {
            "filler_ranges_detected": len(ranges_ms),
            "enhancements": [
                "rnnoise-denoise",
                "loudnorm",
                *(["filler-trim"] if ranges_ms else []),
            ],
            "transcript_id": transcript.get("id"),
        }

        return EnhancedAudioResult(
            output_path=export_path,
            duration_ms=duration_ms,
            temp_dir=temp_dir,
            metadata=metadata,
        )

    except Exception:
        # Make sure we don't leak directories when FFmpeg or AssemblyAI fails
        try:
            await asyncio.to_thread(_safe_cleanup, temp_dir)
        except RuntimeError:
            _safe_cleanup(temp_dir)
        raise


def build_reduction_ranges(
    transcript_words: Sequence[dict],
    filler_terms: Sequence[str],
    pause_gap_ms: int,
) -> List[Tuple[int, int]]:
    """
    Convert AssemblyAI `words` payload into time ranges to trim.
    """
    filler_lookup = {term.strip().lower() for term in filler_terms}
    ranges: List[Tuple[int, int]] = []
    previous_end = None

    for word in transcript_words:
        text = str(word.get("text") or "").strip().lower()
        start = int(word.get("start") or 0)
        end = int(word.get("end") or start)

        if filler_lookup and text in filler_lookup:
            ranges.append((start, end))

        if previous_end is not None and pause_gap_ms and start - previous_end >= pause_gap_ms:
            ranges.append((previous_end, start))

        previous_end = end

    return merge_ranges(ranges)


def merge_ranges(ranges: Sequence[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """
    Merge overlapping ranges and drop invalid windows.
    """
    sanitized = [(max(0, start), max(max(0, start), end)) for start, end in ranges if end > start]
    if not sanitized:
        return []

    sanitized.sort(key=lambda rng: rng[0])
    merged: List[Tuple[int, int]] = []

    current_start, current_end = sanitized[0]
    for start, end in sanitized[1:]:
        if start <= current_end:
            current_end = max(current_end, end)
            continue
        merged.append((current_start, current_end))
        current_start, current_end = start, end

    merged.append((current_start, current_end))
    return merged


def strip_segments(audio: AudioSegment, ranges: Sequence[Tuple[int, int]]) -> AudioSegment:
    """
    Remove the provided millisecond ranges from the audio segment.
    """
    if not ranges:
        return audio

    total_duration = len(audio)
    cleaned = AudioSegment.empty()
    cursor = 0

    for start, end in merge_ranges(ranges):
        start_clamped = max(0, min(start, total_duration))
        end_clamped = max(start_clamped, min(end, total_duration))

        if start_clamped > cursor:
            cleaned += audio[cursor:start_clamped]
        cursor = max(cursor, end_clamped)

    if cursor < total_duration:
        cleaned += audio[cursor:]

    # Guard against over-aggressive trimming; if the result is < 1s, keep original.
    return cleaned if len(cleaned) >= 1000 else audio


async def _transcribe_with_assemblyai(wav_path: Path, config: AudioEnhancerConfig) -> dict:
    headers = {
        "authorization": config.api_key,
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(base_url=config.base_url, headers=headers, timeout=60.0) as client:
        upload_url = await _upload_audio_file(client, wav_path)
        transcript_id = await _create_transcript(client, upload_url)
        return await _poll_transcript(client, transcript_id, config)


async def _upload_audio_file(client: httpx.AsyncClient, path: Path) -> str:
    async def chunk_reader(chunk_size: int = 1024 * 1024):
        with open(path, "rb") as handle:
            while True:
                chunk = await asyncio.to_thread(handle.read, chunk_size)
                if not chunk:
                    break
                yield chunk

    response = await client.post("/upload", content=chunk_reader())
    response.raise_for_status()
    data = response.json()
    upload_url = data.get("upload_url")
    if not upload_url:
        raise RuntimeError("AssemblyAI upload response missing 'upload_url'")
    return upload_url


async def _create_transcript(client: httpx.AsyncClient, upload_url: str) -> str:
    payload = {
        "audio_url": upload_url,
        "disfluencies": True,
        "punctuate": True,
        "format_text": True,
        "auto_chapters": False,
    }
    response = await client.post("/transcript", json=payload)
    response.raise_for_status()
    transcript_id = response.json().get("id")
    if not transcript_id:
        raise RuntimeError("AssemblyAI transcript response missing 'id'")
    return transcript_id


async def _poll_transcript(
    client: httpx.AsyncClient,
    transcript_id: str,
    config: AudioEnhancerConfig,
) -> dict:
    max_attempts = max(1, int(config.poll_timeout // config.poll_interval))

    for _ in range(max_attempts):
        response = await client.get(f"/transcript/{transcript_id}")
        response.raise_for_status()

        payload = response.json()
        status = payload.get("status")

        if status == "completed":
            return payload
        if status == "error":
            raise RuntimeError(f"AssemblyAI transcription failed: {payload.get('error')}")

        await asyncio.sleep(config.poll_interval)

    raise TimeoutError("AssemblyAI transcription timed out")


async def _run_ffmpeg(args: List[str], description: str, timeout: int = 120) -> None:
    process = await asyncio.create_subprocess_exec(
        "ffmpeg",
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
    except asyncio.TimeoutError as exc:
        process.kill()
        await process.communicate()
        raise RuntimeError(f"FFmpeg timed out while trying to {description}") from exc

    if process.returncode != 0:
        raise RuntimeError(
            f"FFmpeg failed to {description}: {stderr.decode('utf-8', errors='ignore') or stdout.decode('utf-8', errors='ignore')}"
        )


def _strip_and_export(
    denoised_path: Path,
    ranges_ms: Sequence[Tuple[int, int]],
    export_path: Path,
) -> int:
    audio = AudioSegment.from_file(denoised_path)
    cleaned = strip_segments(audio, ranges_ms)
    cleaned.export(
        export_path,
        format="webm",
        codec="libopus",
        parameters=["-b:a", "192k"],
    )
    return len(cleaned)


def _write_upload_to_path(upload_file: UploadFile, destination: Path) -> None:
    upload_file.file.seek(0)
    with destination.open("wb") as target:
        shutil.copyfileobj(upload_file.file, target)


def _safe_cleanup(path: Path) -> None:
    try:
        from .file_utils import cleanup_temp_path

        cleanup_temp_path(path)
    except Exception:  # pragma: no cover - best-effort cleanup
        logger.warning("Failed to cleanup temp dir %s", path, exc_info=True)

