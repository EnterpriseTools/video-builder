import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import './TrimControls.scss';

/**
 * Shared trim controls component with timeline and manual time entry
 * Used across all templates that support video/audio trimming
 */
export default function TrimControls({ 
  duration = 0,
  startTime = 0,
  endTime = 0,
  onStartTimeChange,
  onEndTimeChange,
  onPreviewRange,
  videoRef = null,
  disabled = false,
  stopAtEnd = false  // NEW: Optional prop to stop playback at trim end
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

  // Update current time from video
  useEffect(() => {
    if (!videoRef?.current || !endTime) return;

    const handleTimeUpdate = () => {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      
      setCurrentTime(currentTime);
      
      // Only stop at trim end if stopAtEnd prop is true
      // This prevents stopping during normal video preview
      if (stopAtEnd && currentTime >= endTime && !video.paused) {
        video.pause();
        video.currentTime = startTime;
      }
    };

    const video = videoRef.current;
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, endTime, startTime, stopAtEnd]);

  if (!duration || disabled) {
    return null;
  }

  return (
    <div className="trim-controls">
      <div className="trim-header">
        <h4>Trim Video/Audio</h4>
        <p>Drag the handles or enter times to trim your media</p>
      </div>

      {/* Timeline with Drag Handles */}
      <div className="timeline-section">
        <div className="timeline-container">
          <div 
            ref={timelineRef}
            className={`timeline ${isDraggingLeft || isDraggingRight ? 'dragging' : ''}`}
            onClick={handleTimelineClick}
          >
            <div className="timeline-track">
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

        {/* Preview Range Button */}
        {onPreviewRange && videoRef && (
          <div className="trim-actions">
            <Button 
              onClick={onPreviewRange}
              variant="secondary"
              size="small"
            >
              Preview Trimmed Range
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

