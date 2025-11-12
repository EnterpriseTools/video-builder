import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import AudioWaveform from '@/components/shared/audio-waveform';
import './TrimControls.scss';

/**
 * Shared trim controls component with timeline and manual time entry
 * Used across all templates that support video/audio trimming
 * Can display audio waveform visualization when audioFile is provided
 */
export default function TrimControls({ 
  duration = 0,
  startTime = 0,
  endTime = 0,
  onStartTimeChange,
  onEndTimeChange,
  videoRef = null,
  audioFile = null, // Optional audio file for waveform visualization
  disabled = false
}) {
  const timelineRef = useRef(null);
  const audioRef = useRef(null);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  // Create audio URL when audioFile changes
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
        setAudioUrl(null);
      };
    }
  }, [audioFile]);

  // Initialize audio currentTime to startTime when audio loads
  useEffect(() => {
    if (!audioRef?.current) return;
    
    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
    };
    
    const audio = audioRef.current;
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [startTime]);

  // Adjust playhead when handles are dragged past it (only when not playing)
  useEffect(() => {
    if (isPlaying) return;
    
    // If left handle moved past current position, snap to new startTime
    if (currentTime < startTime) {
      setCurrentTime(startTime);
      if (audioRef?.current) {
        audioRef.current.currentTime = startTime;
      }
    }
    
    // If right handle moved past current position, snap to new endTime
    if (currentTime > endTime) {
      setCurrentTime(endTime);
      if (audioRef?.current) {
        audioRef.current.currentTime = endTime;
      }
    }
  }, [startTime, endTime, currentTime, isPlaying]);

  // Time formatting function
  const formatTimeWithDecimals = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00.000';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const decimals = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${decimals.toString().padStart(3, '0')}`;
  }, []);

  // Audio play/pause handler
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Start from trim start if at end or outside trim boundaries
      const currentPos = audioRef.current.currentTime;
      if (currentPos < startTime || currentPos >= endTime) {
        audioRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, startTime, endTime]);

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
    if (disabled || !duration) return;
    const timeline = timelineRef.current;
    if (!timeline) return;

    const rect = timeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    if (videoRef?.current) {
      videoRef.current.currentTime = newTime;
    }
    if (audioRef?.current) {
      audioRef.current.currentTime = newTime;
    }
  }, [duration, videoRef, disabled]);

  // Timeline dragging effect
  useEffect(() => {
    if (!duration || disabled) return;

    const handleMouseMove = (e) => {
      if (!isDraggingLeft && !isDraggingRight) return;

      const timeline = timelineRef.current;
      if (!timeline) return;

      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * duration;

      if (isDraggingLeft) {
        const newStart = Math.max(0, Math.min(newTime, endTime - 0.1));
        onStartTimeChange(newStart);
        if (videoRef?.current) {
          videoRef.current.currentTime = newStart;
        }
        if (audioRef?.current) {
          audioRef.current.currentTime = newStart;
        }
      } else if (isDraggingRight) {
        const newEnd = Math.max(startTime + 0.1, Math.min(newTime, duration));
        onEndTimeChange(newEnd);
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
  }, [isDraggingLeft, isDraggingRight, duration, startTime, endTime, onStartTimeChange, onEndTimeChange, videoRef, disabled]);

  // Update current time from video and enforce trim boundaries
  useEffect(() => {
    if (!videoRef?.current || !duration) return;

    const handleTimeUpdate = () => {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      
      setCurrentTime(currentTime);
      
      // Only enforce trim boundaries if the trim has been meaningfully adjusted
      // Allow 0.5 second tolerance to treat near-full-length as "no trim"
      const isTrimmedFromStart = startTime > 0.5;
      const isTrimmedFromEnd = endTime < (duration - 0.5);
      const hasValidTrim = isTrimmedFromStart || isTrimmedFromEnd;
      
      if (hasValidTrim && currentTime >= endTime && !video.paused) {
        video.pause();
        video.currentTime = startTime; // Loop back to trim start
      }
    };

    const video = videoRef.current;
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, endTime, startTime, duration]);

  // Update current time from audio and enforce trim boundaries
  useEffect(() => {
    if (!audioRef?.current) return;

    const handleTimeUpdate = () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      const currentTime = audio.currentTime;
      
      setCurrentTime(currentTime);
      
      // Only enforce trim boundaries if the trim has been meaningfully adjusted
      const isTrimmedFromStart = startTime > 0.5;
      const isTrimmedFromEnd = endTime < (duration - 0.5);
      const hasValidTrim = isTrimmedFromStart || isTrimmedFromEnd;
      
      if (hasValidTrim && currentTime >= endTime && !audio.paused) {
        audio.pause();
        setIsPlaying(false);
        // Stay at end position, don't loop back
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const audio = audioRef.current;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    
    // Trigger initial update
    if (audio.readyState >= 1) {
      setCurrentTime(audio.currentTime || startTime);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [endTime, startTime, duration]);

  // Sync video position with trim boundaries when handles are dragged past it
  useEffect(() => {
    if (!videoRef?.current) return;
    
    const video = videoRef.current;
    const currentTime = video.currentTime;
    
    // If current position is outside trim boundaries, seek to nearest boundary
    if (currentTime < startTime) {
      video.currentTime = startTime;
    } else if (currentTime > endTime) {
      video.currentTime = endTime;
    }
  }, [startTime, endTime, videoRef]);

  if (!duration || disabled) {
    return null;
  }

  return (
    <div className="trim-controls">
      {/* Hidden audio element for playback */}
      {audioFile && audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}

      <div className="trim-header">
        <div className="trim-header-content">
          <div>
            <h4>Trim Video/Audio</h4>
            <p>Drag the handles or enter times to trim your media</p>
          </div>
          {audioFile && (
            <button 
              className="audio-play-button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/>
                  <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5.14v13.72L19 12L8 5.14z" fill="currentColor"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Timeline with Drag Handles and Optional Waveform */}
      <div className="timeline-section">
        <div className="timeline-container">
          <div 
            ref={timelineRef}
            className={`timeline ${isDraggingLeft || isDraggingRight ? 'dragging' : ''} ${audioFile ? 'with-waveform' : ''}`}
            onClick={handleTimelineClick}
          >
            <div className="timeline-track">
              {/* Audio Waveform Background */}
              {audioFile && (
                <AudioWaveform 
                  audioFile={audioFile}
                  duration={duration}
                  embedded={true}
                  startTime={startTime}
                  endTime={endTime}
                />
              )}
              
              {/* Dimmed overlay for unselected regions */}
              {audioFile && (
                <>
                  <div 
                    className="timeline-dim-left"
                    style={{ width: `${(startTime / duration) * 100}%` }}
                  />
                  <div 
                    className="timeline-dim-right"
                    style={{ 
                      left: `${(endTime / duration) * 100}%`,
                      width: `${((duration - endTime) / duration) * 100}%`
                    }}
                  />
                </>
              )}
              
              <div 
                className="timeline-progress"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <div 
                className="timeline-selection"
                style={{
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`
                }}
              />
              <div 
                className="timeline-handle timeline-handle-left"
                style={{ left: `${(startTime / duration) * 100}%` }}
                onMouseDown={handleLeftHandleMouseDown}
              />
              <div 
                className="timeline-handle timeline-handle-right"
                style={{ 
                  left: `calc(${(endTime / duration) * 100}% - 12px)` 
                }}
                onMouseDown={handleRightHandleMouseDown}
              />
              <div 
                className="timeline-current-time"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

