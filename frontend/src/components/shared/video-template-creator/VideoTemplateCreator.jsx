import { useEffect, useState, useRef } from 'react';
import Button from '@/components/shared/button';
import IconButton from '@/components/shared/icon-button';
import { Input, FileInput } from '@/components/shared/input';
import RenderingModal from '@/components/shared/rendering-modal';
import TemplatePreview from '@/components/shared/template-preview';
import TrimControls from '@/components/shared/trim-controls';
import AIImageGenerator from '@/components/shared/ai-image-generator';
import { useVideoTemplate } from '@/hooks/useVideoTemplate';
import './VideoTemplateCreator.scss';

// Start Over Icon
const StartOverIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M7.0037 8C8.16925 6.54602 9.95635 5.61175 11.9621 5.60011C11.9896 5.59995 12.017 5.59997 12.0445 5.60015C13.7519 5.61179 15.3005 6.29199 16.4414 7.39203C16.5076 7.45583 16.5724 7.52108 16.6359 7.58775C17.7088 8.71466 18.375 10.2323 18.3992 11.9053C18.4003 11.9715 18.4002 12.0378 18.3992 12.1041C18.3727 13.7633 17.7148 15.269 16.6555 16.3917C16.5708 16.4814 16.4836 16.5687 16.3937 16.6535C15.2693 17.7156 13.7601 18.3746 12.0971 18.3993C12.0357 18.4003 11.9742 18.4003 11.9127 18.3995C8.68784 18.3563 6.03878 15.9281 5.64932 12.7984C5.59475 12.36 5.24183 12 4.8 12C4.35818 12 3.99585 12.359 4.03995 12.7986C4.06701 13.0684 4.10769 13.3358 4.16162 13.6C4.4452 14.9892 5.09515 16.2882 6.05722 17.3557C7.38153 18.8252 9.20331 19.7519 11.1709 19.9569C13.1384 20.1619 15.1121 19.6307 16.7108 18.4659C18.3097 17.301 19.4203 15.585 19.8281 13.6494C20.236 11.7137 19.9121 9.69557 18.9192 7.98462C17.9264 6.27367 16.3348 4.99126 14.4518 4.38499C12.5689 3.77871 10.528 3.89159 8.72337 4.7018C7.47854 5.26069 6.40698 6.12405 5.6 7.19998V5.6C5.6 5.15818 5.24182 4.8 4.8 4.8C4.35818 4.8 4 5.15818 4 5.6V8.8V9.60001H4.8H7.99999C8.44181 9.60001 8.79999 9.24183 8.79999 8.8C8.79999 8.35818 8.44181 8 7.99999 8H7.0037Z"/>
  </svg>
);

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

  // State for showing upload image link in persona template
  const [showManualUpload, setShowManualUpload] = useState(false);

  // Track AI image generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [hasAIConversation, setHasAIConversation] = useState(false);

  // Toggle state for how-it-works template image visibility
  // Default: false (don't show image)
  const [showImage, setShowImage] = useState(() => {
    // Check if this is the how-it-works template
    if (config.id !== 'how-it-works') return false;
    // Restore saved state or default to false (don't show image)
    return savedData?.showImage ?? false;
  });

  // Mode state for how-it-works template (audioImage vs video)
  const [templateMode, setTemplateMode] = useState(() => {
    // Check if this template supports modes
    if (!config.supportsModeToggle) return null;
    // Restore saved state or default to the default mode
    const defaultMode = Object.values(config.modes).find(m => m.default)?.id || 'audioImage';
    return savedData?.templateMode ?? defaultMode;
  });

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Create a config with hideOverlay, showImage, and templateMode included for the hook
  const configWithOverlay = {
    ...config,
    hideOverlay: config.id === 'persona' ? hideOverlay : undefined,
    showImage: config.id === 'how-it-works' ? showImage : undefined,
    templateMode: config.supportsModeToggle ? templateMode : undefined
  };

  // Ref for video player (for intro and demo templates)
  const videoPlayerRef = useRef(null);
  
  // Ref for AI Image Generator (to access startOver function)
  const aiImageGeneratorRef = useRef(null);

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
  }, [textData, files, hideOverlay, showImage, templateMode]);

  // Persist hideOverlay state when it changes
  useEffect(() => {
    if (config.id === 'persona' && onDataChange) {
      onDataChange({ ...savedData, hideOverlay });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideOverlay, config.id]);

  // Persist showImage state when it changes
  useEffect(() => {
    if (config.id === 'how-it-works' && onDataChange) {
      onDataChange({ ...savedData, showImage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImage, config.id]);

  // Persist templateMode state when it changes
  useEffect(() => {
    if (config.supportsModeToggle && onDataChange) {
      onDataChange({ ...savedData, templateMode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateMode, config.supportsModeToggle]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Expose hasUnsavedChanges to parent via config callback
  useEffect(() => {
    if (config.onUnsavedChanges) {
      config.onUnsavedChanges(hasUnsavedChanges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges]);

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
                    onClick={() => handleClearFileWithReset(fileConfig.id)}
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
                    onClick={() => handleClearFileWithReset(fileConfig.id)}
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

  // Handle AI-generated image (now receives base64 data URL)
  const handleAIImageGenerated = async (dataUrl) => {
    try {
      // Convert base64 data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], `ai-persona-${Date.now()}.png`, { type: 'image/png' });
      
      // Create a synthetic event to pass to handleFileUpload
      const syntheticEvent = {
        target: {
          files: [file]
        }
      };
      
      // Use the existing file upload handler
      await handleFileUpload('image', syntheticEvent);
      
      // Small delay to ensure preview URL is created and state is updated
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      // Silent error handling for production
    }
  };

  // Wrap handleClearFile to reset persona-specific state
  const handleClearFileWithReset = (fileId) => {
    handleClearFile(fileId);
    
    // Reset to AI generator view when clearing persona image
    if (config.id === 'persona' && fileId === 'image') {
      setShowManualUpload(false);
    }
  };

  // Handle mode toggle for templates that support it
  const handleModeToggle = (newMode) => {
    if (!config.supportsModeToggle) return;
    
    setTemplateMode(newMode);
    
    // Clear all files when switching modes
    Object.keys(files).forEach(fileId => {
      if (files[fileId]?.file) {
        handleClearFile(fileId);
      }
    });
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  };

  return (
    <div className="video-template-modal">
      <div className="template-layout">
        {/* Left Column - Configuration */}
        <div className="template-config-column">
          {/* Mode Toggle for templates that support it - at top level */}
          {config.supportsModeToggle && (
            <div className="mode-toggle">
              {Object.entries(config.modes).map(([key, mode]) => (
                <button
                  key={key}
                  className={`mode-toggle-button ${templateMode === mode.id ? 'active' : ''}`}
                  onClick={() => handleModeToggle(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          {/* PERSONA TEMPLATE: Step 1 - Audio Upload Only */}
          {config.id === 'persona' && (
            <div className="config-section">
              <div className="section-header">
                <div className="step-number">1</div>
                <h2>Upload Audio</h2>
              </div>
              <div className="section-content">
                {config.files
                  .filter(fileConfig => fileConfig.id === 'audio')
                  .map((fileConfig, index) => 
                    renderFileSection(fileConfig, index + 1)
                  )}
              </div>
            </div>
          )}

          {/* PERSONA TEMPLATE: Step 2 - AI Image Generator */}
          {config.id === 'persona' && (
            <div className="config-section">
              <div className="section-header">
                <div className="step-number">2</div>
                <h2>Generate Persona Image</h2>
                {/* Show upload link or start over button based on conversation state */}
                {!files.image?.file && !isGeneratingAI && (
                  <div className="manual-upload-link">
                    {!hasAIConversation ? (
                      <button 
                        className="link-button"
                        onClick={() => setShowManualUpload(!showManualUpload)}
                      >
                        {showManualUpload ? '← Back to AI Generator' : 'Upload image'}
                      </button>
                    ) : (
                      <IconButton
                        icon={<StartOverIcon />}
                        tooltip="Reset"
                        onClick={() => aiImageGeneratorRef.current?.handleStartOver()}
                        variant="tertiary"
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="section-content">
                {!files.image?.file ? (
                  <>
                    {!showManualUpload ? (
                      <AIImageGenerator 
                        ref={aiImageGeneratorRef}
                        onImageGenerated={handleAIImageGenerated}
                        onGeneratingChange={setIsGeneratingAI}
                        onConversationChange={setHasAIConversation}
                      />
                    ) : (
                      <>
                        {config.files
                          .filter(fileConfig => fileConfig.id === 'image')
                          .map((fileConfig) => renderFileSection(fileConfig, 2))}
                      </>
                    )}
                  </>
                ) : (
                  // Show uploaded/generated image
                  <>
                    {config.files
                      .filter(fileConfig => fileConfig.id === 'image')
                      .map((fileConfig) => renderFileSection(fileConfig, 2))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* File Upload Section (for NON-persona templates) */}
          {config.id !== 'persona' && config.files.length > 0 && (
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
                    // For how-it-works template, exclude image file from step 1 (it's in step 3)
                    if (config.id === 'how-it-works' && fileConfig.id === 'image') {
                      return false;
                    }
                    // Filter files based on current mode
                    if (config.supportsModeToggle && fileConfig.modes) {
                      return fileConfig.modes.includes(templateMode);
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
          {config.textFields.length > 0 && !(config.supportsModeToggle && templateMode === 'video') && (
            <div className="config-section">
              <div className="section-header">
                <div className="step-number">{config.id === 'persona' ? '3' : '2'}</div>
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
                {/* Also filter by mode if modes are supported */}
                {(!hideOverlay || config.id !== 'persona') && (
                  <div className="text-fields">
                    {config.textFields
                      .filter(fieldConfig => {
                        // Filter text fields based on current mode
                        if (config.supportsModeToggle && fieldConfig.modes) {
                          return fieldConfig.modes.includes(templateMode);
                        }
                        return true;
                      })
                      .map(fieldConfig => (
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

          {/* Step 3: Optional Image Section (for how-it-works template only in audioImage mode) */}
          {config.id === 'how-it-works' && templateMode === 'audioImage' && (
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

        {/* Right Column - Preview (not shown for intro/demo templates, or how-it-works in video mode) */}
        {config.id !== 'intro' && config.id !== 'demo' && !(config.id === 'how-it-works' && templateMode === 'video') && (
          <div className="template-preview-column">
            <div className="preview-section">
              <div className="preview-header">
                <h2>Preview:</h2>
              </div>
              <div className="preview-content">
                {/* Show preview when image is uploaded (persona, announcement) or when all required files are present */}
                {/* For how-it-works in audioImage mode, show preview if audio is uploaded (even without optional image) */}
                {(config.id === 'persona' && files.image?.file) || 
                 (config.id === 'announcement' && files.image?.file) || 
                 (config.id === 'how-it-works' && templateMode === 'audioImage' && files.audio?.file) ||
                 hasRequiredFiles ? (
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
                      {config.id === 'persona' ? 'Upload or generate image to see preview' : 
                       (config.id === 'announcement' ? 'Upload image to see preview' : 
                       (config.id === 'how-it-works' && templateMode === 'audioImage' ? 'Upload audio to see preview' :
                       (!hasRequiredFiles ? 'Upload files to see preview' : 'Enter details to see preview')))}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
        )}

        {/* Inline Video Player for intro, demo, and how-it-works in video mode */}
        {(((config.id === 'intro' || config.id === 'demo') && files.video?.file && files.video?.preview) || 
         (config.id === 'how-it-works' && templateMode === 'video' && files.video?.file && files.video?.preview)) && (
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
                
                {/* Overlay TxtOverlay on top of video for intro template only */}
                {config.id === 'intro' && hasTextData && (
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

              {/* Trim Controls for intro/demo/how-it-works video mode */}
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
          )}
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

