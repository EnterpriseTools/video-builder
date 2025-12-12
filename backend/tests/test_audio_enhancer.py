import math

from pydub import AudioSegment
from pydub.generators import Sine

from app.utils.audio_enhancer import build_reduction_ranges, merge_ranges, strip_segments


def test_merge_ranges_handles_overlaps():
    ranges = [(0, 100), (90, 200), (250, 300), (260, 310)]
    assert merge_ranges(ranges) == [(0, 200), (250, 310)]


def test_build_reduction_ranges_detects_fillers_and_pauses():
    words = [
        {"text": "Hello", "start": 0, "end": 400},
        {"text": "um", "start": 500, "end": 700},
        {"text": "team", "start": 900, "end": 1200},
        {"text": "like", "start": 2100, "end": 2300},
        {"text": "news", "start": 3000, "end": 3400},
    ]

    ranges = build_reduction_ranges(words, filler_terms=("um", "like"), pause_gap_ms=600)

    # Expect filler ranges plus gaps. Pause between 1200-2100 merges with the filler
    # word (2100-2300) and the subsequent pause (2300-3000), creating one large window.
    assert ranges == [(500, 700), (1200, 3000)]


def test_strip_segments_removes_ranges_but_leaves_short_audio():
    tone = Sine(440).to_audio_segment(duration=3000)
    sample = AudioSegment.silent(duration=3000).overlay(tone)
    ranges = [(500, 1000), (1200, 1500)]

    cleaned = strip_segments(sample, ranges)

    # 3000ms - (500 interval + 300 interval) = 2200ms
    assert math.isclose(len(cleaned), 2200, rel_tol=0.05)

