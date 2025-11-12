import { useEffect, useState, useRef } from 'react';
import Button from '@/components/shared/button';
import { Input, FileInput } from '@/components/shared/input';
import RenderingModal from '@/components/shared/rendering-modal';
import TemplatePreview from '@/components/shared/template-preview';
import TrimControls from '@/components/shared/trim-controls';
import { useVideoTemplate } from '@/hooks/useVideoTemplate';
import './VideoTemplateCreator.scss';

/**
 * Shared component for all video template creators
 * Provides consistent UI and behavior across all templates
 */
export default function VideoTemplateCreator({ config, savedData, onDataChange }) {
  // Toggle state for persona template overlay visibility
  // Default: false (show overlay)
  const [hideOverlay, setHideOverlay] = useState(() => {
    // Check if this is the persona template
    if (config.id !== 'persona') return false;
    // Restore saved state or default to false (show overlay)
    return savedData?.hideOverlay ?? false;
  });

  // Toggle state for how-it-works template image visibility
  // Default: false (don't show image)
  const [showImage, setShowImage] = useState(() => {
    // Check if this is the how-it-works template
    if (config.id !== 'how-it-works') return false;
    // Restore saved state or default to false (don't show image)
    return savedData?.showImage ?? false;
  });

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Create a config with hideOverlay and showImage included for the hook
  const configWithOverlay = {
    ...config,
    hideOverlay: config.id === 'persona' ? hideOverlay : undefined,
    showImage: config.id === 'how-it-works' ? showImage : undefined
  };

  // Ref for video player (for intro and demo templates)
  const videoPlayerRef = useRef(null);

  const {
    // State
    textData,
    files,
    loading,
    rendering,
    error,
    showPreview,

    // File handlers
    handleFileUpload,
    handleClearFile,

    // Text handlers
    handleTextChange,

    // Trim handlers
    handleTrimChange,

    // Render handlers
    renderVideo,

    // Preview handlers
    handlePreview,
    closePreview,

    // Computed values
    hasTextData,
    hasRequiredFiles,
    canRender,

    // Utilities
    getFormattedDuration,
    cleanup
  } = useVideoTemplate(configWithOverlay);

  // Track unsaved changes when data changes
  useEffect(() => {
    // Mark as having unsaved changes when any data changes
    setHasUnsavedChanges(true);
  }, [textData, files, hideOverlay, showImage]);

  // Persist hideOverlay state when it changes
  useEffect(() => {
    if (config.id === 'persona' && onDataChange) {
      onDataChange({ ...savedData, hideOverlay });
    }
  }, [hideOverlay, config.id, savedData, onDataChange]);

  // Persist showImage state when it changes
  useEffect(() => {
    if (config.id === 'how-it-works' && onDataChange) {
      onDataChange({ ...savedData, showImage });
    }
  }, [showImage, config.id, savedData, onDataChange]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Expose hasUnsavedChanges to parent via config callback
  useEffect(() => {
    if (config.onUnsavedChanges) {
      config.onUnsavedChanges(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, config]);

  // Render file upload section for a specific file type
  const renderFileSection = (fileConfig, stepNumber) => {
    const fileData = files[fileConfig.id];
    const hasFile = !!fileData.file;

    return (
      <div className="file-upload-section" key={fileConfig.id}>
        {hasFile ? (
          <div className="file-preview">
            {/* Image preview */}
            {fileConfig.type === 'image' && fileData.preview && (
              <div className="image-preview">
                <div className="image-info">
                  <div className="image-thumbnail-small">
                    <img src={fileData.preview} alt="Preview" />
                  </div>
                  <div className="image-details">
                    <span className="image-name">{fileData.name}</span>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="small" 
                    onClick={() => handleClearFile(fileConfig.id)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}

            {/* Video preview - show file info only */}
            {fileConfig.type === 'video' && fileData.thumbnail && (
              <div className="video-preview">
                <div className="file-info">
                  <div className="file-details">
                    <span className="file-name">{fileData.name}</span>
                    {fileData.duration > 0 && (
                      <span className="file-duration">
                        Duration: {getFormattedDuration(fileConfig.id)}
                      </span>
                    )}
                  </div>
                  <div className="file-actions">
                    <Button 
                      variant="destructive" 
                      size="small" 
                      onClick={() => handleClearFile(fileConfig.id)}
                    >
                      ✕
                    </Button>
                    {config.features?.showVideoPreviewButton && (
                      <Button 
                        variant="secondary" 
                        size="small" 
                        onClick={handlePreview}
                      >
                        Preview Video
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Audio/Media preview */}
            {(fileConfig.type === 'audio' || fileConfig.type === 'media') && (
              <div className="audio-preview">
                <div className="audio-info">
                  <div className="audio-details">
                    <span className="audio-name">{fileData.name}</span>
                    {fileData.duration > 0 && (
                      <span className="audio-duration">
                        Duration: {getFormattedDuration(fileConfig.id)}
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="destructive" 
                    size="small" 
                    onClick={() => handleClearFile(fileConfig.id)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="upload-dropzone">
            <div className="upload-content">
              <p className="upload-description">{fileConfig.description}</p>
              <div className="upload-button-container">
                <FileInput
                  accept={fileConfig.accept}
                  onChange={(e) => handleFileUpload(fileConfig.id, e)}
                  uploadText={fileConfig.uploadText || 'Upload Video'}
                  className="upload-button"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render text fields section
  const renderTextSection = () => {
    // Don't show text section if no text fields are configured
    if (config.textFields.length === 0) return null;
    
    // Don't show text section if required files aren't uploaded yet
    if (!hasRequiredFiles) return null;

    return (
      <div className="template-card">
        <div className="card-header">
          <div className="card-number">{config.files.length + 1}</div>
          <div className="card-info">
            <h3>{config.name.replace(' Creator', '')} Information</h3>
            <p>Enter the details for your video</p>
          </div>
          <div className="card-status">
            {hasTextData ? (
              <span className="status-complete">✓ Information Added</span>
            ) : (
              <span className="status-empty">No Information</span>
            )}
          </div>
        </div>

        <div className="card-content">
          <div className="text-section">
            {config.textFields.map(fieldConfig => (
              <Input
                key={fieldConfig.id}
                label={fieldConfig.label}
                value={textData[fieldConfig.id] || ''}
                onChange={(e) => handleTextChange(fieldConfig.id, e.target.value)}
                placeholder={fieldConfig.placeholder}
                required={fieldConfig.required}
                multiline={fieldConfig.multiline}
                rows={fieldConfig.rows}
              />
            ))}
          </div>

          {hasTextData && (
            <div className="text-extras">

              {/* Live Preview Section */}
              <TemplatePreview
                config={config}
                textData={textData}
                files={files}
                showPreview={showPreview}
                onClose={closePreview}
                audioDuration={files.audio?.duration || 0}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="video-template-modal">
      <div className="template-layout">
        {/* Left Column - Configuration */}
        <div className="template-config-column">
          {/* Persona Template Helper Link */}
          {config.id === 'persona' && (
            <div className="config-section persona-helper">
              <div className="helper-content">
                <p className="helper-text">
                  Need to create your user persona?{' '}
                  <a 
                    href="https://chatgpt.com/g/g-68ba01f03f5c8191aa28eb55bd8afce8-user-persona-image-generator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="helper-link"
                  >
                    Open GPT Modal
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          {config.files.length > 0 && (
            <div className="config-section">
              <div className="section-header">
                <div className="step-number">1</div>
                <h2>{config.sectionHeaders?.files || 'Upload files:'}</h2>
                {config.tooltips?.files && (
                  <div className="tooltip-container">
                    <span className="tooltip-trigger">
                      <svg className="tooltip-icon-default" viewBox="0 0 24 24" fill="#F7F7F7" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM13 13.3551V14H11V12.5C11 11.9477 11.4477 11.5 12 11.5C12.8284 11.5 13.5 10.8284 13.5 10C13.5 9.17157 12.8284 8.5 12 8.5C11.2723 8.5 10.6656 9.01823 10.5288 9.70577L8.56731 9.31346C8.88637 7.70919 10.302 6.5 12 6.5C13.933 6.5 15.5 8.067 15.5 10C15.5 11.5855 14.4457 12.9248 13 13.3551Z" />
                      </svg>
                      <svg className="tooltip-icon-hover" viewBox="0 0 24 24" fill="#F7F7F7" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM13 13.3551C14.4457 12.9248 15.5 11.5855 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.302 6.5 8.88637 7.70919 8.56731 9.31346L10.5288 9.70577C10.6656 9.01823 11.2723 8.5 12 8.5C12.8284 8.5 13.5 9.17157 13.5 10C13.5 10.8284 12.8284 11.5 12 11.5C11.4477 11.5 11 11.9477 11 12.5V14H13V13.3551Z" />
                      </svg>
                    </span>
                    <div className="tooltip-content">
                      {config.tooltips.files}
                    </div>
                  </div>
                )}
              </div>
              <div className="section-content">
                {config.files
                  .filter(fileConfig => {
                    // For how-it-works template, exclude image file from step 1
                    if (config.id === 'how-it-works' && fileConfig.id === 'image') {
                      return false;
                    }
                    return true;
                  })
                  .map((fileConfig, index) => 
                    renderFileSection(fileConfig, index + 1)
                  )}
              </div>
            </div>
          )}

          {/* Text Fields Section */}
          {config.textFields.length > 0 && (
            <div className="config-section">
              <div className="section-header">
                <div className="step-number">2</div>
                <h2>{config.sectionHeaders?.text || 'Add details:'}</h2>
                
                {/* Toggle for persona template */}
                {config.id === 'persona' && (
                  <label className="overlay-toggle">
                    <input
                      type="checkbox"
                      checked={hideOverlay}
                      onChange={(e) => setHideOverlay(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Hide Overlay</span>
                  </label>
                )}
                
                {config.tooltips?.text && (
                  <div className="tooltip-container">
                    <span className="tooltip-trigger">
                      <svg className="tooltip-icon-default" viewBox="0 0 24 24" fill="#F7F7F7" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM13 13.3551V14H11V12.5C11 11.9477 11.4477 11.5 12 11.5C12.8284 11.5 13.5 10.8284 13.5 10C13.5 9.17157 12.8284 8.5 12 8.5C11.2723 8.5 10.6656 9.01823 10.5288 9.70577L8.56731 9.31346C8.88637 7.70919 10.302 6.5 12 6.5C13.933 6.5 15.5 8.067 15.5 10C15.5 11.5855 14.4457 12.9248 13 13.3551Z" />
                      </svg>
                      <svg className="tooltip-icon-hover" viewBox="0 0 24 24" fill="#F7F7F7" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM13 13.3551C14.4457 12.9248 15.5 11.5855 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.302 6.5 8.88637 7.70919 8.56731 9.31346L10.5288 9.70577C10.6656 9.01823 11.2723 8.5 12 8.5C12.8284 8.5 13.5 9.17157 13.5 10C13.5 10.8284 12.8284 11.5 12 11.5C11.4477 11.5 11 11.9477 11 12.5V14H13V13.3551Z" />
                      </svg>
                    </span>
                    <div className="tooltip-content">
                      {config.tooltips.text}
                    </div>
                  </div>
                )}
              </div>
              <div className="section-content">
                {/* Only show text fields if hideOverlay is false (for persona template) or if not persona template */}
                {(!hideOverlay || config.id !== 'persona') && (
                  <div className="text-fields">
                    {config.textFields.map(fieldConfig => (
                      <Input
                        key={fieldConfig.id}
                        label={fieldConfig.label}
                        value={textData[fieldConfig.id] || ''}
                        onChange={(e) => handleTextChange(fieldConfig.id, e.target.value)}
                        placeholder={fieldConfig.placeholder}
                        required={fieldConfig.required}
                        multiline={fieldConfig.multiline}
                        rows={fieldConfig.rows}
                        size="small"
                      />
                    ))}
                  </div>
                )}
                
                {/* Show message when overlay is hidden */}
                {hideOverlay && config.id === 'persona' && (
                  <div className="overlay-hidden-message">
                    <p>Overlay hidden. Your video will render with the background image and audio only.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Optional Image Section (for how-it-works template only) */}
          {config.id === 'how-it-works' && (
            <div className="config-section">
              <div className="section-header">
                <div className="step-number">3</div>
                <h2>Add Image: <span className="optional-label">(Optional)</span></h2>
                
                {/* Toggle for showing image upload */}
                <label className="overlay-toggle">
                  <input
                    type="checkbox"
                    checked={showImage}
                    onChange={(e) => setShowImage(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Show Image</span>
                </label>
              </div>
              
              {/* Only show image upload when toggle is ON */}
              {showImage && (
                <div className="section-content">
                  {config.files
                    .filter(fileConfig => fileConfig.id === 'image')
                    .map((fileConfig) => renderFileSection(fileConfig, 3))}
                </div>
              )}
              
              {/* Show message when toggle is OFF */}
              {!showImage && (
                <div className="section-content">
                  <div className="overlay-hidden-message">
                    <p>Toggle "Show Image" to add an optional image above your text overlay.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className="template-preview-column">
          <div className="preview-section">
            <div className="preview-header">
              <h2>Preview:</h2>
            </div>
            <div className="preview-content">
              {/* Show preview for intro/demo templates only in right column if no video (shouldn't happen) */}
              {/* For other templates, show preview when requirements are met */}
              {config.id === 'intro' || config.id === 'demo' ? (
                <div className="preview-placeholder">
                  <div className="placeholder-content">
                    {files.video?.file ? 'See video player below for preview with overlay' : 'Upload video to see preview'}
                  </div>
                </div>
              ) : (config.id === 'announcement' && files.image?.file) || hasRequiredFiles ? (
                <TemplatePreview
                  config={config}
                  textData={textData}
                  files={files}
                  showPreview={showPreview}
                  onClose={closePreview}
                  audioDuration={files.audio?.duration || files.video?.duration || 0}
                  hideOverlay={config.id === 'persona' ? hideOverlay : undefined}
                  showImage={config.id === 'how-it-works' ? showImage : undefined}
                />
              ) : (
                <div className="preview-placeholder">
                  <div className="placeholder-content">
                    {config.id === 'announcement' ? 'Upload image to see preview' : (!hasRequiredFiles ? 'Upload files to see preview' : 'Enter details to see preview')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inline Video Player for intro and demo templates */}
          {(config.id === 'intro' || config.id === 'demo') && files.video?.file && files.video?.preview && (
            <div className="inline-video-player">
              <div className="video-player-container">
                <video
                  ref={videoPlayerRef}
                  src={files.video.preview}
                  controls
                  preload="metadata"
                  playsInline
                  className="inline-video"
                >
                  Your browser does not support the video tag.
                </video>
                
                {/* Overlay TxtOverlay on top of video for intro/demo templates */}
                {hasTextData && (
                  <div className="video-overlay-preview">
                    <TemplatePreview
                      config={config}
                      textData={textData}
                      files={files}
                      showPreview={false}
                      onClose={closePreview}
                      audioDuration={files.video?.duration || 0}
                      overlayOnly={true}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trim Controls - show for any file with duration */}
          {Object.entries(files).map(([fileId, fileData]) => {
            // Only show trim controls for files with duration (video or audio)
            if (!fileData.file || fileData.duration <= 0) return null;
            
            const fileConfig = config.files.find(f => f.id === fileId);
            if (!fileConfig) return null;

            // Check if this file type supports trimming (video or media)
            const supportsTrimmingTypes = ['video', 'media'];
            if (!supportsTrimmingTypes.includes(fileConfig.type)) return null;

            return (
              <TrimControls
                key={fileId}
                duration={fileData.duration}
                startTime={fileData.trimStart}
                endTime={fileData.trimEnd}
                onStartTimeChange={(newStart) => handleTrimChange(fileId, newStart, fileData.trimEnd)}
                onEndTimeChange={(newEnd) => handleTrimChange(fileId, fileData.trimStart, newEnd)}
                videoRef={fileConfig.type === 'video' ? videoPlayerRef : null}
                audioFile={fileConfig.type === 'media' ? fileData.file : null}
                disabled={false}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="template-actions">
        <div className="action-buttons">
          <Button 
            variant="tertiary" 
            size="medium"
            onClick={config.onDelete}
          >
            Cancel
          </Button>
            
          <Button
            onClick={renderVideo}
            disabled={!canRender || rendering}
            loading={rendering}
            variant="primary"
            size="medium"
          >
            Save Changes
          </Button>
        </div>
      </div> 

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Rendering Modal */}
      <RenderingModal 
        isVisible={rendering}
        title={`Rendering Your ${config.name.replace(' Creator', '')}`}
        description="Processing your video with overlays and effects..."
        note="This may take a minute depending on video length"
      />
    </div>
  );
}

