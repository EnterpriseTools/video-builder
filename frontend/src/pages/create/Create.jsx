import { useState, useEffect, lazy, Suspense } from 'react';
import VideoTemplateCreator from '@/components/shared/video-template-creator';
import { getTemplateConfig } from '@/lib/templateConfigs';
import OverlayPreviewSection from '@/components/shared/overlay-preview-section';
import { API_BASE_URL } from '@/lib/config';
import './Create.scss';

// Lazy load overlay components for thumbnails
const AnnouncementOverlay = lazy(() => import('@/components/announcement-overlay/AnnouncementOverlay'));
const HowItWorksOverlay = lazy(() => import('@/components/how-it-works-overlay/HowItWorksOverlay'));
const ClosingOverlay = lazy(() => import('@/components/closing-overlay/ClosingOverlay'));

// Helper function to render preview thumbnail for templates
function renderPreviewThumbnail(template) {
  const config = getTemplateConfig(template.id);
  const { textData = {}, files = {} } = template.config || {};
  
  // Get overlay component and props based on template type
  const getOverlayComponent = () => {
    switch (template.id) {
      case 'announcement':
        return (
          <AnnouncementOverlay
            title={textData.title || config.defaults?.title || ''}
            description={textData.description || config.defaults?.description || ''}
            imagePreview={files.image?.preview || null}
          />
        );
      case 'how-it-works':
        return (
          <HowItWorksOverlay
            title={textData.title || config.defaults?.title || 'How It Works'}
            description={textData.description || config.defaults?.description || ''}
            stepNumber={null}
            subtitle={null}
          />
        );
      case 'closing':
        return (
          <ClosingOverlay
            title={textData.title || config.defaults?.title || ''}
            subtitle={textData.subtitle || config.defaults?.subtitle || ''}
            email={textData.email || config.defaults?.email || ''}
            teamName={textData.teamName || config.defaults?.teamName || ''}
            directorName={textData.directorName || config.defaults?.directorName || ''}
          />
        );
      default:
        return null;
    }
  };

  const overlayComponent = getOverlayComponent();
  if (!overlayComponent) return null;

  // Get background image for announcement template
  const backgroundImage = template.id === 'announcement' ? files.image?.preview : null;
  const shouldSetBackground = !!backgroundImage;

  return (
    <div className="preview-thumbnail-container">
      <OverlayPreviewSection
        config={config}
        overlayComponent={overlayComponent}
        audioDuration={0}
        files={files}
        backgroundImage={backgroundImage}
        shouldSetBackground={shouldSetBackground}
        showRestartButton={false}
        showDecorativeElements={true}
        containerClassName="thumbnail-preview"
      />
    </div>
  );
}

// Wrapper component that intercepts the render action
function VideoTemplateModalWrapper({ templateId, onDone, onCancel, initialData }) {
  const config = getTemplateConfig(templateId);
  
  // We need to modify the config to intercept the render action
  const modalConfig = {
    ...config,
    onRenderIntercept: (templateData, wasReset) => {
      // Instead of rendering, call onDone with the configured data and reset flag
      onDone(templateData, wasReset);
    },
    onCancel: onCancel, // Pass cancel function through config
    initialData: initialData // Pass saved data for editing
  };

  return (
    <div className="modal-template-wrapper">
      <VideoTemplateCreator config={modalConfig} />
    </div>
  );
}

export default function Create() {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState('');

  // Timeline state - templates in fixed order
  const [templates, setTemplates] = useState([
    { id: 'intro', name: 'Introduction', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'announcement', name: 'Feature', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'how-it-works', name: 'Context', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'persona', name: 'Who it\'s for', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'demo', name: 'Demo', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'closing', name: 'Closing', status: 'empty', config: null, previewData: null, savedData: null }
  ]);

  // Template name to ID mapping
  const templateNameToId = {
    'Introduction': 'intro',
    'Feature': 'announcement', 
    'Context': 'how-it-works',
    'Who it\'s for': 'persona',
    'Demo': 'demo',
    'Closing': 'closing'
  };

  const handleAddClick = (templateName) => {
    const templateId = templateNameToId[templateName];
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate({ 
      name: templateName, 
      id: templateId,
      savedData: template?.savedData || null // Pass saved data if editing
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleTemplateDone = async (templateData, wasReset = false) => {
    if (!selectedTemplate) return;
    
    // If reset was clicked, clear the template from timeline
    if (wasReset) {
      setTemplates(prev => prev.map(template => 
        template.id === selectedTemplate.id 
          ? { 
              ...template, 
              status: 'empty', 
              config: null,
              previewData: null,
              savedData: null
            }
          : template
      ));
      closeModal();
      return;
    }
    
    try {
      // Create stable preview data that won't be revoked
      const stablePreviewData = {};
      
      // Process files and create stable previews
      for (const [fileId, fileData] of Object.entries(templateData.files)) {
        if (fileData.file) {
          if (fileData.file.type.startsWith('image/')) {
            // Create data URL for images
            const dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(fileData.file);
            });
            
            stablePreviewData[fileId] = {
              ...fileData,
              preview: dataUrl
            };
          } else {
            // For videos/audio, use thumbnail or create a placeholder
            stablePreviewData[fileId] = {
              ...fileData,
              preview: fileData.thumbnail || null
            };
          }
        }
      }
      
      // Update the template state
      setTemplates(prev => prev.map(template => 
        template.id === selectedTemplate.id 
          ? { 
              ...template, 
              status: 'ready', 
              config: templateData,
              previewData: stablePreviewData,
              savedData: templateData // Save for editing later
            }
          : template
      ));
      
    } catch (error) {
      console.error('Error processing template data:', error);
      // Still mark as ready but without preview
      setTemplates(prev => prev.map(template => 
        template.id === selectedTemplate.id 
          ? { 
              ...template, 
              status: 'ready', 
              config: templateData,
              previewData: {},
              savedData: templateData // Save for editing later
            }
          : template
      ));
    }
    
    // Close modal
    closeModal();
  };

  const handleRenderFinal = async () => {
    const readyTemplates = templates.filter(t => t.status === 'ready');
    console.log('Rendering final presentation with templates:', readyTemplates);
    
    if (readyTemplates.length === 0) {
      alert('Fill out at least 1 template to render a video');
      return;
    }
    
    setIsRendering(true);
    
    try {
      // Step 1: Render each template individually to get video data
      setRenderingProgress('Rendering individual template videos...');
      console.log('Step 1: Rendering individual template videos...');
      const renderedVideos = [];
      
      for (const template of readyTemplates) {
        setRenderingProgress(`Rendering ${template.name}...`);
        console.log(`Rendering ${template.name}...`);
        
        // Create FormData for this template
        const formData = new FormData();
        
        // Add files
        Object.entries(template.config.files).forEach(([fileId, fileData]) => {
          if (fileData.file) {
            formData.append(fileId, fileData.file);
            if (fileData.duration > 0) {
              formData.append('duration', fileData.duration.toString());
            }
          }
        });
        
        // Add text data
        Object.entries(template.config.textData).forEach(([key, value]) => {
          formData.append(key, value || '');
        });
        
        // Get template config and call the API
        const templateConfig = getTemplateConfig(template.id);
        const response = await fetch(templateConfig.api.render, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${template.name} render failed: ${errorText}`);
        }
        
        // Get video data as bytes
        const videoBlob = await response.blob();
        const videoBytes = await videoBlob.arrayBuffer();
        
        // Map template ID to correct order (1-6)
        const templateOrderMap = {
          'intro': 1,
          'announcement': 2,
          'how-it-works': 3,
          'persona': 4,
          'demo': 5,
          'closing': 6
        };
        
        renderedVideos.push({
          order: templateOrderMap[template.id],
          videoData: videoBytes,
          templateName: template.name,
          templateId: template.id
        });
        
        console.log(`${template.name} rendered successfully!`);
      }
      
      // Step 2: Get filename from announcement template title
      const announcementTemplate = readyTemplates.find(t => t.id === 'announcement');
      const finalFilename = announcementTemplate?.config?.textData?.title || 'presentation-final';
      
      setRenderingProgress(`Combining ${renderedVideos.length} videos into final presentation...`);
      console.log(`Step 2: Concatenating ${renderedVideos.length} videos into "${finalFilename}.mp4"...`);
      
      // Step 3: Send videos to concatenation endpoint
      const concatenateFormData = new FormData();
      
      // Debug: Check what video data we have
      console.log('Rendered videos data:');
      renderedVideos.forEach(video => {
        console.log(`- ${video.templateName}: order=${video.order}, dataSize=${video.videoData.byteLength} bytes`);
      });
      
      // Create a mapping from template order to video data
      const videoMap = {};
      renderedVideos.forEach(video => {
        videoMap[video.order] = video;
        console.log(`Mapped order ${video.order} to ${video.templateName}`);
      });
      
      // Add videos to FormData in the correct segment slots based on their template order
      // Template order: 1=intro, 2=announcement, 3=how-it-works, 4=persona, 5=demo, 6=closing
      for (let i = 0; i < 6; i++) {
        const templateOrder = i + 1; // Templates are ordered 1-6
        const video = videoMap[templateOrder];
        
        console.log(`Looking for template order ${templateOrder} in slot ${i}:`, video ? `Found ${video.templateName}` : 'Not found');
        
        if (video) {
          const videoBlob = new Blob([video.videoData], { type: 'video/mp4' });
          concatenateFormData.append(`segment_${i}`, videoBlob, `segment_${i}.mp4`);
          concatenateFormData.append(`order_${i}`, video.order.toString());
          console.log(`Adding video ${video.templateName} to segment_${i} with order ${video.order}`);
        } else {
          console.log(`No video found for template order ${templateOrder}, skipping segment_${i}`);
        }
      }
      
      concatenateFormData.append('final_filename', finalFilename);
      
      // Debug: Log what we're sending
      console.log('FormData contents:');
      for (let [key, value] of concatenateFormData.entries()) {
        if (value instanceof File || value instanceof Blob) {
          console.log(`${key}: ${value.constructor.name} (${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      const concatenateResponse = await fetch(`${API_BASE_URL}/api/concatenate-multipart`, {
        method: 'POST',
        body: concatenateFormData,
      });
      
      if (!concatenateResponse.ok) {
        const errorText = await concatenateResponse.text();
        console.error('Concatenation response error:', errorText);
        throw new Error(`Video concatenation failed: ${errorText}`);
      }
      
      console.log('Concatenation request successful, content-type:', concatenateResponse.headers.get('content-type'));
      
      // Step 4: Download the final concatenated video
      setRenderingProgress('Preparing download...');
      console.log('Step 3: Downloading final presentation video...');
      const finalVideoBlob = await concatenateResponse.blob();
      
      const url = URL.createObjectURL(finalVideoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${finalFilename}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Final presentation video created successfully!');
      setRenderingProgress(`Successfully created "${finalFilename}.mp4"!`);
      
      // Show success message briefly, then clear
      setTimeout(() => {
        setIsRendering(false);
        setRenderingProgress('');
        alert(`Successfully created final presentation: "${finalFilename}.mp4"`);
      }, 1000);
      
    } catch (error) {
      console.error('Final render error:', error);
      console.error('Error stack:', error.stack);
      setIsRendering(false);
      setRenderingProgress('');
      alert(`Error creating final presentation: ${error.message}`);
    }
  };

  // Check if all templates are ready for final render
  const allTemplatesReady = templates.every(t => t.status === 'ready');
  const hasAnyReady = templates.some(t => t.status === 'ready');
  return (
    <div className="video-builder">
      <div className="video-builder-container">

        <div className="video-builder-section-title ">
          <h1 className="video-builder-title">Axon Take One</h1>
          <p className="video-builder-subtitle">Record your case. We’ll file and share the evidence.</p>
        </div>
        
        <div className="template-grid">
          {templates.map((template) => (
            <div key={template.id} className={`template-card ${template.status === 'ready' ? 'ready' : ''}`}>
              <div className="template-content">
                {template.status === 'ready' && template.previewData ? (
                  <div className="template-preview">
                    {(() => {
                      // For specific templates, show the preview component
                      if (['announcement', 'how-it-works', 'closing'].includes(template.id)) {
                        return (
                          <Suspense fallback={<div className="placeholder-thumbnail"><span>Loading...</span></div>}>
                            {renderPreviewThumbnail(template)}
                          </Suspense>
                        );
                      }
                      
                      // For other templates, find first available preview image
                      const previewUrl = Object.values(template.previewData).find(fileData => 
                        fileData?.preview
                      )?.preview;
                      
                      return previewUrl ? (
                        <img 
                          src={previewUrl}
                          alt={`${template.name} preview`}
                          className="preview-thumbnail"
                        />
                      ) : (
                        <div className="placeholder-thumbnail">
                          <span>{template.name}</span>
                        </div>
                      );
                    })()}
                    <div className="ready-indicator">
                      <div className="checkmark">✓</div>
                    </div>
                  </div>
                ) : (
                  <h3 className="template-name">{template.name}</h3>
                )}
              </div>
              <button 
                className="add-button" 
                onClick={() => handleAddClick(template.name)}
              >
                <span className="add-icon"></span>
                {template.status === 'ready' ? 'Edit' : '+ Add'}
              </button>
            </div>
          ))}
        </div>

        {/* Final Render Button */}
        {hasAnyReady && (
          <div className="final-render-section">
            <button 
              className={`final-render-button ${isRendering ? 'loading' : ''}`}
              onClick={handleRenderFinal}
              disabled={!hasAnyReady || isRendering}
            >
              {isRendering ? (
                <div className="loading-content">
                  <div className="spinner"></div>
                  <span>{renderingProgress}</span>
                </div>
              ) : hasAnyReady ? (
                'Create Final Presentation'
              ) : (
                'Configure at least 1 template'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedTemplate && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedTemplate.name} Template</h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <VideoTemplateModalWrapper
                templateId={selectedTemplate.id}
                onDone={handleTemplateDone}
                onCancel={closeModal}
                initialData={selectedTemplate.savedData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}