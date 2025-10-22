import { useState, useEffect, lazy, Suspense } from 'react';
import VideoTemplateCreator from '@/components/shared/video-template-creator';
import { getTemplateConfig } from '@/lib/templateConfigs';
import OverlayPreviewSection from '@/components/shared/overlay-preview-section';
import { API_BASE_URL } from '@/lib/config';
import Trim from '@/pages/trim/Trim';
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

// Intercepts the render action
function VideoTemplateModalWrapper({ templateId, onDone, onCancel, onDelete, initialData }) {
  const config = getTemplateConfig(templateId);
  
  const modalConfig = {
    ...config,
    onRenderIntercept: (templateData) => {
      // Instead of rendering, call onDone with the configured data
      onDone(templateData);
    },
    onCancel: onCancel, 
    onDelete: onDelete, 
    initialData: initialData 
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
  const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);

  // Timeline state - templates in fixed order
  const [templates, setTemplates] = useState([
    { id: 'intro', name: 'Introduction', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'announcement', name: 'Feature', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'how-it-works', name: 'Problem', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'persona', name: 'Who it\'s for', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'demo', name: 'Demo', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'closing', name: 'Closing', status: 'empty', config: null, previewData: null, savedData: null }
  ]);

  // Template name to ID mapping
  const templateNameToId = {
    'Introduction': 'intro',
    'Feature': 'announcement', 
    'Problem': 'how-it-works',
    'Who it\'s for': 'persona',
    'Demo': 'demo',
    'Closing': 'closing'
  };

  const handleAddClick = (templateName) => {
    const templateId = templateNameToId[templateName];
    const template = templates.find(t => t.id === templateId);
    
    // Special handling for Closing template: pre-fill teamName with Intro's team value
    let initialData = template?.savedData || null;
    if (templateId === 'closing' && !initialData) {
      // Find intro template and get its team value
      const introTemplate = templates.find(t => t.id === 'intro');
      const introTeamValue = introTemplate?.savedData?.textData?.team;
      
      if (introTeamValue) {
        // Create initial data with intro's team as default teamName
        initialData = {
          textData: {
            teamName: introTeamValue
          }
        };
      }
    }
    
    setSelectedTemplate({ 
      name: templateName, 
      id: templateId,
      savedData: initialData
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
      <div className="highlight-global"></div>
      <div className="video-builder-container">

        <div className="video-builder-section-title ">
          <button 
            className="trim-clip-button"
            onClick={() => setIsTrimModalOpen(true)}
            title="Trim Clip"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
            </svg>
            Trim Clip
          </button>
          <div className="logo-container">
            <img src="/TakeOneLogo.png" alt="Axon TakeOne Logo" />
            <div className="video-builder-title">
              <svg viewBox="0 0 692 163" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M155.99 56.7051H167.58V138.785H179.36V152.846H165.68V140.875H144.21V152.846H106.97V140.875H95V103.636H106.97V91.8555H153.9V58.6055H109.06V82.165H95V56.7051H106.97V44.9258H155.99V56.7051ZM345.99 56.7051H357.58V68.2949H369.36V105.726H299.06V127.195H310.65V138.785H343.9V127.195H355.68V115.415H369.36V129.096H357.58V140.875H345.99V152.846H308.75V140.875H296.97V129.096H285V68.2949H296.97V56.7051H308.75V44.9258H345.99V56.7051ZM84.3604 23.4551H49.21V152.845H35.3398V23.4551H0V9.58496H84.3604V23.4551ZM204.06 91.8545H213.75V80.0752H225.34V68.2949H248.9V56.7051H260.68V44.9248H274.36V58.6045H262.58V70.3848H250.99V82.165H227.43V93.9453H215.65V103.635H227.43V115.415H250.99V127.195H262.58V138.785H274.36V152.845H260.68V140.875H248.9V129.095H225.34V117.315H213.75V105.725H204.06V152.845H190V9.58496H204.06V91.8545ZM109.06 138.785H142.12V127.195H153.9V105.726H109.06V138.785ZM310.65 70.3857H299.06V91.8555H355.68V70.3857H343.9V58.6055H310.65V70.3857Z" fill="white"/>
                <path d="M456.626 15.3809H468.216V27.1602H479.995V134.891H468.216V146.671H456.626V158.641H419.386V146.671H407.605V134.891H395.636V27.1602H407.605V15.3809H419.386V3.79004H456.626V15.3809ZM504.695 62.5H514.386V50.7207H551.626V62.5H563.216V74.0898H574.995V158.641H561.315V76.1807H549.535V64.4004H516.285V76.1807H504.695V158.641H490.636V50.7207H504.695V62.5ZM646.626 62.5H658.216V74.0898H669.995V111.521H599.695V132.99H611.285V144.58H644.535V132.99H656.315V121.21H669.995V134.891H658.216V146.67H646.626V158.641H609.386V146.67H597.605V134.891H585.636V74.0898H597.605V62.5H609.386V50.7207H646.626V62.5ZM421.285 29.251H409.695V132.99H421.285V144.58H454.535V132.99H466.315V29.251H454.535V17.4707H421.285V29.251ZM611.285 76.1807H599.695V97.6504H656.315V76.1807H644.535V64.4004H611.285V76.1807Z" fill="#F4D22B"/>
              </svg>
              <p>Record your case. We'll share the evidence.</p>
            </div>
          </div>
         
        </div>
        
        <div className="template-grid">
          {templates.map((template) => (
            <div 
              key={template.id} 
              className={`template-card ${template.status === 'ready' ? 'ready' : ''}`}
              onClick={() => {
                // Only handle click for empty templates
                if (template.status !== 'ready') {
                  handleAddClick(template.name);
                }
              }}
            >
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
                        <svg viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M72.0492 16.7961H62.5297L60.6406 9.22569C59.4318 4.37985 55.1029 1 50.1199 1H30.8896C25.9064 1 21.5812 4.37985 20.3688 9.22569L18.4798 16.7961H8.95741C7.3234 16.7961 6 18.1214 6 19.7577C6 21.394 7.3234 22.7192 8.95741 22.7192H10.1477L13.3676 67.9156C13.7705 73.5684 18.5209 78 24.1846 78H56.8154C62.4789 78 67.2293 73.5688 67.6324 67.9156L70.8523 22.7192H72.0426C73.6766 22.7192 75 21.394 75 19.7577C75 18.1214 73.6766 16.7961 72.0426 16.7961H72.0492ZM26.1096 10.662C26.6604 8.45938 28.6271 6.92308 30.8932 6.92308H50.1234C52.3895 6.92308 54.3563 8.46308 54.9071 10.662L56.4375 16.7961H24.5752L26.1056 10.662H26.1096ZM61.7385 67.4942C61.5574 70.0633 59.3947 72.0771 56.8219 72.0771H24.1872C21.6106 72.0771 19.4517 70.0633 19.2706 67.4942L16.0766 22.7195H64.9291L61.7351 67.4942H61.7385ZM45.4326 55.2964V35.5541C45.4326 33.9178 46.756 32.5926 48.39 32.5926C50.024 32.5926 51.3474 33.9178 51.3474 35.5541V55.2964C51.3474 56.9327 50.024 58.258 48.39 58.258C46.756 58.258 45.4326 56.9327 45.4326 55.2964ZM29.6623 55.2964V35.5541C29.6623 33.9178 30.9857 32.5926 32.6197 32.5926C34.2537 32.5926 35.5771 33.9178 35.5771 35.5541V55.2964C35.5771 56.9327 34.2537 58.258 32.6197 58.258C30.9857 58.258 29.6623 56.9327 29.6623 55.2964Z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="ready-indicator">
                      <div className="checkmark">✓</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="template-name">
                      {template.name}
                    </h3>
                    <button className="add-button">
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
                'Create Video'
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

      {/* Trim Clip Modal */}
      {isTrimModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTrimModalOpen(false)}>
          <div className="modal-content trim-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Trim Clip</h2>
              <button className="modal-close" onClick={() => setIsTrimModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <Trim />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}