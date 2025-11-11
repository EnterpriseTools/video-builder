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
  const [manualTimeOpen, setManualTimeOpen] = useState(false);

  // Time formatting function
  const formatTimeWithDecimals = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00.000';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const decimals = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${decimals.toString().padStart(3, '0')}`;
  }, []);

  // Parse timecode function
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

  // Handle timecode changes
  const handleStartTimecodeChange = useCallback((value) => {
    const newStart = parseTimecode(value);
    if (newStart >= 0 && newStart < endTime) {
      onStartTimeChange(newStart);
      if (videoRef?.current) {
        videoRef.current.currentTime = newStart;
      }
    }
  }, [endTime, parseTimecode, onStartTimeChange, videoRef]);

  const handleEndTimecodeChange = useCallback((value) => {
    const newEnd = parseTimecode(value);
    if (newEnd > startTime && newEnd <= duration) {
      onEndTimeChange(newEnd);
    }
  }, [startTime, duration, parseTimecode, onEndTimeChange]);

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
          
          <div className="timeline-info">
            <div className="timeline-time">
              <span>Current: {formatTimeWithDecimals(currentTime)}</span>
              <span>Duration: {formatTimeWithDecimals(duration)}</span>
              {(isDraggingLeft || isDraggingRight) && (
                <span className="dragging-indicator">Dragging...</span>
              )}
            </div>
          </div>
        </div>

        {/* Manual Time Entry Accordion */}
        <div className="manual-time-accordion">
          <div 
            className="accordion-header"
            onClick={() => setManualTimeOpen(!manualTimeOpen)}
          >
            <h4>Manual Time Entry</h4>
            <span className="accordion-toggle">{manualTimeOpen ? '−' : '+'}</span>
          </div>
          
          {manualTimeOpen && (
            <div className="accordion-content">
              <p className="input-instructions">
                Enter the start and end times in timecode format (e.g., 1:30.500). 
                The media will be trimmed from the start time to the end time.
              </p>
              <div className="time-input-grid">
                <div className="time-input-group">
                  <Input
                    id="trim-start-time"
                    label="Start Time:"
                    variant="time"
                    size="small"
                    value={formatTimeWithDecimals(startTime)}
                    onChange={(e) => handleStartTimecodeChange(e.target.value)}
                    placeholder="0:00.000"
                  />
                  <span className="time-display">{formatTimeWithDecimals(startTime)}</span>
                </div>
                
                <div className="time-input-group">
                  <Input
                    id="trim-end-time"
                    label="End Time:"
                    variant="time"
                    size="small"
                    value={formatTimeWithDecimals(endTime)}
                    onChange={(e) => handleEndTimecodeChange(e.target.value)}
                    placeholder={formatTimeWithDecimals(duration)}
                  />
                  <span className="time-display">{formatTimeWithDecimals(endTime)}</span>
                </div>
              </div>
              
              <div className="selection-info">
                <div className="selection-duration">
                  <strong>Selection Duration: {formatTimeWithDecimals(endTime - startTime)}</strong>
                </div>
                <div className="trim-info">
                  <span>Total Duration: {formatTimeWithDecimals(duration)}</span>
                </div>
              </div>
            </div>
          )}
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

