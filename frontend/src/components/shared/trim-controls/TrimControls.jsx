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
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Time formatting function
  const formatTimeWithDecimals = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00.000';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const decimals = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${decimals.toString().padStart(3, '0')}`;
  }, []);

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

  // Sync video position with trim boundaries when handles are adjusted
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
      <div className="trim-header">
        <h4>Trim Video/Audio</h4>
        <p>Drag the handles or enter times to trim your media</p>
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

