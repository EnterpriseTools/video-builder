import { useState, useCallback, useRef, useEffect } from 'react';
import { downloadBlob } from '@/lib/templateValidation';
import { API_BASE_URL } from '@/lib/config';

/**
 * Custom hook for managing video trim state and operations
 * Uses native HTML5 video element for better codec support
 * @returns {Object} - Hook state and methods
 */
export function useVideoTrim() {
  // Refs for native video element
  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  // File state
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

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
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
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
      if (videoRef.current) {
        videoRef.current.currentTime = newStart;
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
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
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

    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
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
        if (videoRef.current) {
          videoRef.current.currentTime = newStart;
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

  // Native video element initialization effect
  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;

    const video = videoRef.current;
    
    // Set video source
    video.src = videoUrl;
    
    // Event listeners for native video element
    const handleLoadedMetadata = () => {
      const videoDuration = video.duration;
      if (videoDuration && !isNaN(videoDuration) && isFinite(videoDuration)) {
        setDuration(videoDuration);
        setEndTime(videoDuration);
        setError(''); // Clear any previous errors
      } else {
        // If duration is invalid, allow manual time entry
        setError('Video preview not available. You can still trim by entering start/end times manually. Click "Manual Time Entry" below.');
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleError = (e) => {
      console.error('Video error:', e, video.error);
      if (video.error) {
        const errorCode = video.error.code;
        
        // For format errors, try to generate a preview on the server
        if (errorCode === 3 || errorCode === 4) {
          setError('Video codec not supported by browser. Generating preview...');
          generateServerPreview();
        } else {
          const errorMessages = {
            1: 'Video loading aborted',
            2: 'Network error while loading video'
          };
          setError(errorMessages[errorCode] || 'Video preview unavailable. You can still trim by entering times manually.');
          setDuration(0); // User will need to set duration manually
          setManualTimeOpen(true); // Auto-open manual time entry
        }
      }
    };

    // Function to generate server-side preview
    const generateServerPreview = async () => {
      if (!videoFile || isGeneratingPreview) return;
      
      setIsGeneratingPreview(true);
      setError('Generating browser-compatible preview... This may take a moment.');
      
      try {
        const formData = new FormData();
        formData.append('video', videoFile);
        
        const response = await fetch(`${API_BASE_URL}/api/trim/preview`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Preview generation failed');
        }
        
        // Get duration from response headers
        const durationHeader = response.headers.get('X-Video-Duration');
        const previewDuration = durationHeader ? parseFloat(durationHeader) : 0;
        
        // Get the preview video blob
        const blob = await response.blob();
        const previewUrl = URL.createObjectURL(blob);
        
        // Clean up old URL
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
        }
        
        // Set the preview URL
        setVideoUrl(previewUrl);
        
        // Set duration if we got it
        if (previewDuration > 0) {
          setDuration(previewDuration);
          setEndTime(previewDuration);
        }
        
        setError(''); // Clear error
        setIsGeneratingPreview(false);
        
      } catch (err) {
        console.error('Preview generation error:', err);
        setError('Preview generation failed. You can still trim by entering times manually below.');
        setDuration(0);
        setManualTimeOpen(true);
        setIsGeneratingPreview(false);
      }
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
      video.pause();
      video.src = '';
    };
  }, [videoUrl, videoFile, isGeneratingPreview]); // Added videoFile and isGeneratingPreview to dependencies

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  }, [videoUrl]);

  // Cleanup effect
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Refs
    videoRef,
    timelineRef,

    // State
    videoFile,
    videoUrl,
    duration,
    startTime,
    endTime,
    currentTime,
    isExporting,
    isGeneratingPreview,
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
    canExport: !!videoFile && endTime > startTime, // Allow export if we have times, even without duration
    selectionDuration: endTime - startTime
  };
}

