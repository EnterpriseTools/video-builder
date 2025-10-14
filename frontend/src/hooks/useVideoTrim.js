import { useState, useCallback, useRef, useEffect } from 'react';
import videojs from 'video.js';
import { downloadBlob } from '@/lib/templateValidation';
import { API_BASE_URL } from '@/lib/config';

/**
 * Custom hook for managing video trim state and operations
 * @returns {Object} - Hook state and methods
 */
export function useVideoTrim() {
  // Refs for Video.js
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const timelineRef = useRef(null);

  // File state
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  // Timeline state
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // UI state
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [manualTimeOpen, setManualTimeOpen] = useState(false);

  // Dragging state
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  // Time formatting functions
  const formatTimeWithDecimals = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00.000';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const decimals = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${decimals.toString().padStart(3, '0')}`;
  }, []);

  const parseTimecode = useCallback((timecode) => {
    if (!timecode) return 0;
    const match = timecode.match(/^(\d+):(\d{2})\.(\d{3})$/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const decimals = parseInt(match[3]) / 1000;
      return minutes * 60 + seconds + decimals;
    }
    return 0;
  }, []);

  // File upload handler
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Clean up previous video URL if exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setError('');
    }
  }, [videoUrl]);

  // Clear video file
  const handleClearFile = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    setVideoFile(null);
    setVideoUrl(null);
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
    setError('');
  }, [videoUrl]);

  // Timecode change handlers
  const handleStartTimecodeChange = useCallback((value) => {
    const newStart = parseTimecode(value);
    if (newStart >= 0 && newStart < endTime) {
      setStartTime(newStart);
      if (playerRef.current) {
        playerRef.current.currentTime(newStart);
      }
    }
  }, [endTime, parseTimecode]);

  const handleEndTimecodeChange = useCallback((value) => {
    const newEnd = parseTimecode(value);
    if (newEnd > startTime && newEnd <= duration) {
      setEndTime(newEnd);
    }
  }, [startTime, duration, parseTimecode]);

  // Preview range handler
  const handlePreviewRange = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.currentTime(startTime);
      playerRef.current.play();
    }
  }, [startTime]);

  // Export/trim handler
  const handleExport = useCallback(async () => {
    if (!videoFile) {
      setError('No video file selected');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('start', startTime);
      formData.append('end', endTime);

      const response = await fetch(`${API_BASE_URL}/api/trim`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${errorText}`);
      }

      const blob = await response.blob();
      const filename = `trimmed-${videoFile.name}`;
      downloadBlob(blob, filename);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  }, [videoFile, startTime, endTime]);

  // Timeline drag handlers
  const handleLeftHandleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLeft(true);
  }, []);

  const handleRightHandleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRight(true);
  }, []);

  const handleTimelineClick = useCallback((e) => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const rect = timeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    if (playerRef.current) {
      playerRef.current.currentTime(newTime);
    }
  }, [duration]);

  // Timeline dragging effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingLeft && !isDraggingRight) return;

      const timeline = timelineRef.current;
      if (!timeline) return;

      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * duration;

      if (isDraggingLeft) {
        const newStart = Math.max(0, Math.min(newTime, endTime - 1));
        setStartTime(newStart);
        if (playerRef.current) {
          playerRef.current.currentTime(newStart);
        }
      } else if (isDraggingRight) {
        const newEnd = Math.max(startTime + 1, Math.min(newTime, duration));
        setEndTime(newEnd);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight, duration, startTime, endTime]);

  // Video.js player initialization effect
  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;

    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    const player = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      responsive: true,
      preload: 'metadata',
      html5: {
        vhs: {
          overrideNative: true
        }
      }
    });

    playerRef.current = player;

    player.src({
      src: videoUrl,
      type: 'video/mp4'
    });

    player.on('loadedmetadata', () => {
      const videoDuration = player.duration();
      setDuration(videoDuration);
      setEndTime(videoDuration);
    });

    player.on('timeupdate', () => {
      setCurrentTime(player.currentTime());
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [videoUrl]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
  }, [videoUrl]);

  // Cleanup effect
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Refs
    videoRef,
    playerRef,
    timelineRef,

    // State
    videoFile,
    videoUrl,
    duration,
    startTime,
    endTime,
    currentTime,
    isExporting,
    error,
    manualTimeOpen,
    isDraggingLeft,
    isDraggingRight,

    // Handlers
    handleFileUpload,
    handleClearFile,
    handleStartTimecodeChange,
    handleEndTimecodeChange,
    handlePreviewRange,
    handleExport,
    handleLeftHandleMouseDown,
    handleRightHandleMouseDown,
    handleTimelineClick,
    setManualTimeOpen,
    setError,

    // Utilities
    formatTimeWithDecimals,
    parseTimecode,

    // Computed values
    hasVideo: !!videoFile,
    canExport: !!videoFile && duration > 0,
    selectionDuration: endTime - startTime
  };
}

