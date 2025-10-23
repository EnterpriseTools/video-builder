import React from 'react';
import 'video.js/dist/video-js.css';
import Button from '@/components/shared/button';
import { Input, FileInput } from '@/components/shared/input';
import RenderingModal from '@/components/shared/rendering-modal';
import { useVideoTrim } from '@/hooks/useVideoTrim';
import './Trim.scss';

export default function Trim() {
  const {
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
    error,
    manualTimeOpen,
    isDraggingLeft,
    isDraggingRight,

    // Handlers
    handleFileUpload,
    handleStartTimecodeChange,
    handleEndTimecodeChange,
    handlePreviewRange,
    handleExport,
    handleLeftHandleMouseDown,
    handleRightHandleMouseDown,
    handleTimelineClick,
    setManualTimeOpen,

    // Utilities
    formatTimeWithDecimals,

    // Computed values
    canExport
  } = useVideoTrim();

  return (
    <div className="trim-page">
      <div className="trim-container">
        <div className="trim-content">
          <h1>Video Trim Tool</h1>
          <p>Upload a video and use the timeline below to set start and end times.</p>

          {/* Step 1: Upload Video */}
          <div className="section">
            <div className="section-header">
              <h3>1. Upload Video</h3>
            </div>
            <div className="section-content">
              <FileInput
                accept="video/*"
                onChange={handleFileUpload}
                uploadText="Click to upload video"
              />
            </div>
          </div>

          {/* Step 2: Video Player & Timeline */}
          {videoFile && (
            <div className="section">
              <div className="section-header">
                <h3>2. Video Player & Timeline</h3>
              </div>
              <div className="section-content">
                {/* Video Player */}
                <div className="video-section">
                  <h4>Video Player</h4>
                  <div className="video-container">
                    <video
                      ref={videoRef}
                      className="video-js vjs-theme-forest"
                      controls
                      preload="metadata"
                    />
                  </div>
                </div>

                {/* Timeline with Drag Handles */}
                <div className="timeline-section">
                  <h4>Timeline & Trim Points</h4>
                  
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
                          style={{ left: `${(endTime / duration) * 100}%` }}
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
                      <span className="accordion-toggle">{manualTimeOpen ? '-' : '+'}</span>
                    </div>
                    
                    {manualTimeOpen && (
                      <div className="accordion-content">
                        <p className="input-instructions">
                          Enter the start and end times in timecode format (e.g., 1:30.500). 
                          The video will be trimmed from the start time to the end time.
                        </p>
                        <div className="time-input-grid">
                          <div className="time-input-group">
                            <Input
                              id="manual-start-time"
                              label="Start Time:"
                              variant="time"
                              size="medium"
                              value={formatTimeWithDecimals(startTime)}
                              onChange={(e) => handleStartTimecodeChange(e.target.value)}
                              placeholder="0:00.000"
                            />
                            <span className="time-display">{formatTimeWithDecimals(startTime)}</span>
                          </div>
                          
                          <div className="time-input-group">
                            <Input
                              id="manual-end-time"
                              label="End Time:"
                              variant="time"
                              size="medium"
                              value={formatTimeWithDecimals(endTime)}
                              onChange={(e) => handleEndTimecodeChange(e.target.value)}
                              placeholder={duration ? formatTimeWithDecimals(duration) : "0:00.000"}
                            />
                            <span className="time-display">{formatTimeWithDecimals(endTime)}</span>
                          </div>
                        </div>
                        
                        <div className="selection-info">
                          <div className="selection-duration">
                            <strong>Selection Duration: {formatTimeWithDecimals(endTime - startTime)}</strong>
                          </div>
                          <div className="video-info">
                            <span>Video Duration: {formatTimeWithDecimals(duration)}</span>
                            {videoFile && (
                              <span>File Size: {(videoFile.size / (1024 * 1024)).toFixed(1)}MB</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="trim-actions">
                  <div className="action-buttons">
                    <Button 
                      onClick={handlePreviewRange}
                      variant="primary"
                      size="large"
                      disabled={!canExport}
                    >
                      Preview Range
                    </Button>
                    
                    <Button
                      onClick={handleExport}
                      variant="success"
                      size="large"
                      disabled={!canExport || isExporting}
                      loading={isExporting}
                    >
                      Export Trimmed Video
                    </Button>
                  </div>
                  
                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <RenderingModal 
          isVisible={isExporting}
          title="Exporting Trimmed Video"
          description="Processing video trim and creating downloadable file..."
          note="This may take a moment depending on video length and trim duration"
        />
      </div>
    </div>
  );
}
