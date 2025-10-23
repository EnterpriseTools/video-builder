import React from 'react';
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
          <p className="flag"> This tool is currently a WIP. MP4's and MOV's are supported, but some codecs may not preview correctly.</p>

          {/* Step 1: Upload Video */}
          <div className="section">
            <div className="section-header">
              <h3>1. Upload Video</h3>
            </div>
            <div className="section-content">
              {!videoFile ? (
                <FileInput
                  accept="video/*"
                  onChange={handleFileUpload}
                  uploadText="Click to upload video"
                />
              ) : (
                <div className="uploaded-video-preview">
                  <div className="video-thumbnail-container">
                    <video
                      src={videoUrl}
                      className="video-thumbnail"
                      muted
                    />
                    <div className="video-info">
                      <div className="video-filename">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 15.01L9.41 16.42L11 14.84V19H13V14.84L14.59 16.43L16 15.01L12.01 11L8 15.01Z" fill="currentColor"/>
                        </svg>
                        <span>{videoFile.name}</span>
                      </div>
                      <div className="video-size">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                    <button
                      className="delete-video-button"
                      onClick={handleClearFile}
                      title="Remove video"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                  <div className="info-note">
                    <strong>Note:</strong> Some video codecs (ProRes, H.265, etc.) cannot preview in browsers but can still be trimmed successfully on the server. If preview fails, use Manual Time Entry below.
                  </div>
                </div>
              )}
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
                    {isGeneratingPreview && (
                      <div className="preview-loading-overlay">
                        <div className="spinner"></div>
                        <p>Generating browser-compatible preview...</p>
                        <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>This may take a moment</p>
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      className="native-video-player"
                      controls
                      preload="metadata"
                      playsInline
                      style={{ opacity: isGeneratingPreview ? 0.3 : 1 }}
                    >
                      Your browser does not support the video tag.
                    </video>
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
                          {duration === 0 && <strong style={{ color: '#F4D22B', display: 'block', marginTop: '0.5rem' }}>
                            Video preview failed. Please enter the video duration manually to enable trimming.
                          </strong>}
                        </p>
                        <div className="time-input-grid">
                          {duration === 0 && (
                            <div className="time-input-group">
                              <Input
                                id="manual-duration"
                                label="Video Duration:"
                                variant="time"
                                size="medium"
                                value={formatTimeWithDecimals(endTime)}
                                onChange={(e) => {
                                  const newDuration = parseFloat(e.target.value.split(':').reduce((acc, time) => (60 * acc) + +time));
                                  if (!isNaN(newDuration) && newDuration > 0) {
                                    setEndTime(newDuration);
                                  }
                                }}
                                placeholder="0:00.000"
                              />
                              <span className="time-display" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                                Total video length
                              </span>
                            </div>
                          )}
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
