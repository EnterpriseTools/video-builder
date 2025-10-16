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
function VideoTemplateModalWrapper({ templateId, onDone, onCancel, onDelete, initialData }) {
  const config = getTemplateConfig(templateId);
  
  // We need to modify the config to intercept the render action
  const modalConfig = {
    ...config,
    onRenderIntercept: (templateData) => {
      // Instead of rendering, call onDone with the configured data
      onDone(templateData);
    },
    onCancel: onCancel, // Pass cancel function through config
    onDelete: onDelete, // Pass delete function through config
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

  const handleTemplateDelete = () => {
    if (!selectedTemplate) return;
    
    // Clear the template from timeline
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
  };

  const handleTemplateClear = (templateId) => {
    // Clear the template from timeline directly (without modal)
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { 
            ...template, 
            status: 'empty', 
            config: null,
            previewData: null,
            savedData: null
          }
        : template
    ));
  };

  const handleTemplateDone = async (templateData) => {
    if (!selectedTemplate) return;
    
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
                    <div className="thumbnail-hover-overlay">
                      <button 
                        className="edit-button-overlay"
                        onClick={() => handleAddClick(template.name)}
                      >
                        <svg viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M75.895 11.02L70.0044 5.12937C65.6685 0.793472 58.1134 0.801272 53.8014 5.12937L47.9186 11.0122C47.9186 11.0122 47.9108 11.0161 47.9069 11.02C47.903 11.0239 47.903 11.0278 47.8991 11.0317L27.5471 31.3837C25.758 33.1728 24.3479 35.2548 23.3479 37.579L17.4143 51.419C15.9143 54.9346 16.6877 58.9424 19.3791 61.63C21.1682 63.423 23.5197 64.3644 25.926 64.3644C27.1604 64.3644 28.4104 64.1144 29.5979 63.6027L43.4459 57.6691C45.7701 56.6769 47.8561 55.2668 49.6412 53.4738L75.8952 27.2198C80.36 22.755 80.36 15.4818 75.8952 11.0168L75.895 11.02ZM45.223 49.059C43.9964 50.2856 42.5746 51.2465 40.9847 51.9262L27.1327 57.8598C25.996 58.352 24.6796 58.102 23.8007 57.2192C22.9218 56.3402 22.6718 55.0317 23.1601 53.8833L29.0937 40.0473C29.7773 38.4575 30.7421 37.0278 31.9648 35.8012L50.1128 17.6532L63.3708 30.9111L45.223 49.059ZM71.477 22.809L67.7934 26.4926L54.5354 13.2346L58.219 9.55097C60.1917 7.58617 63.6135 7.58617 65.5862 9.55097L71.4768 15.4416C73.5041 17.4689 73.5043 20.7777 71.477 22.809ZM70.1254 58.832V67.164C70.1254 73.4843 64.9887 78.621 58.6684 78.621L12.8324 78.6249C6.51213 78.6249 1.37543 73.4882 1.37543 67.1679V21.1949C1.37543 18.0972 2.59023 15.1988 4.79733 13.0269C7.00043 10.855 9.88713 9.76128 13.0278 9.73778L21.2231 9.87059C22.9497 9.89793 24.3247 11.3198 24.2934 13.0464C24.2661 14.7534 22.8715 16.1206 21.1684 16.1206H21.1137L12.9184 15.9878C11.5864 15.9682 10.184 16.4956 9.18014 17.48C8.18014 18.4683 7.62544 19.7847 7.62544 21.1909V67.1639C7.62544 70.035 9.96134 72.3709 12.8324 72.3709H58.6644C61.5355 72.3709 63.8714 70.035 63.8714 67.1639V58.8319C63.8714 57.1053 65.2698 55.7069 66.9964 55.7069C68.723 55.7069 70.1214 57.1053 70.1214 58.8319L70.1254 58.832Z"/>
                        </svg>
                      </button>
                      <button 
                        className="delete-button-overlay"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateClear(template.id);
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="ready-indicator">
                      <div className="checkmark">✓</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 
                      className="template-name" 
                      onClick={() => handleAddClick(template.name)}
                    >
                      {template.name}
                    </h3>
                    <button 
                      className="add-button" 
                      onClick={() => handleAddClick(template.name)}
                    >
                      <svg viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M61.0236 32.3829H48.8516C47.7735 32.3829 46.8985 31.5079 46.8985 30.4298V18.2578C46.8985 14.2578 43.6446 11 39.6407 11C35.6407 11 32.3829 14.2539 32.3829 18.2578V30.4298C32.3829 31.5079 31.5079 32.3829 30.4298 32.3829H18.2578C14.2578 32.3829 11 35.6368 11 39.6407C11 43.6407 14.2539 46.8985 18.2578 46.8985H30.4298C31.5079 46.8985 32.3829 47.7735 32.3829 48.8516V61.0236C32.3829 65.0236 35.6368 68.2814 39.6407 68.2814C43.6407 68.2814 46.8985 65.0275 46.8985 61.0236V48.8516C46.8985 47.7735 47.7735 46.8985 48.8516 46.8985H61.0236C65.0236 46.8985 68.2814 43.6446 68.2814 39.6407C68.2814 35.6407 65.0275 32.3829 61.0236 32.3829Z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
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
                onDelete={handleTemplateDelete}
                initialData={selectedTemplate.savedData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}