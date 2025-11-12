import { lazy, Suspense } from 'react';
import Button from '@/components/shared/button';
import OverlayPreviewSection from '@/components/shared/overlay-preview-section';
import './TemplatePreview.scss';

// Lazy load overlay components
const TxtOverlay = lazy(() => import('@/components/txt-overlay/TxtOverlay'));
const AnnouncementOverlay = lazy(() => import('@/components/announcement-overlay/AnnouncementOverlay'));
const PersonaTxtOverlay = lazy(() => import('@/components/persona-txt-overlay/PersonaTxtOverlay'));
const HowItWorksOverlay = lazy(() => import('@/components/how-it-works-overlay/HowItWorksOverlay'));
const ClosingOverlay = lazy(() => import('@/components/closing-overlay/ClosingOverlay'));

// Lazy load preview components
const PersonaPreview = lazy(() => import('@/components/persona-preview/PersonaPreview'));

/**
 * Standardized preview interface for all video templates
 */
export default function TemplatePreview({
  config,
  textData,
  files,
  showPreview,
  onClose,
  audioDuration = 0,
  hideOverlay = false,
  showImage = false,
  overlayOnly = false
}) {
  const { preview } = config;
  
  // Get the overlay component based on config
  const getOverlayComponent = () => {
    // For persona template, don't render overlay if hideOverlay is true
    if (config.id === 'persona' && hideOverlay) {
      return null;
    }
    
    const overlayProps = getOverlayProps();
    
    switch (preview.overlayComponent) {
      case 'TxtOverlay':
        return <TxtOverlay {...overlayProps} />;
      case 'AnnouncementOverlay':
        return <AnnouncementOverlay {...overlayProps} />;
      case 'PersonaTxtOverlay':
        return <PersonaTxtOverlay {...overlayProps} />;
      case 'HowItWorksOverlay':
        return <HowItWorksOverlay {...overlayProps} />;
      case 'ClosingOverlay':
        return <ClosingOverlay {...overlayProps} />;
      default:
        return null;
    }
  };

  // Get props for overlay component based on template type
  const getOverlayProps = () => {
    switch (config.id) {
      case 'intro':
        return {
          team: textData.team || config.defaults?.team || 'Your Team',
          fullName: textData.full_name || config.defaults?.full_name || 'Your Name',
          role: textData.role || config.defaults?.role || 'Your Role'
        };
      case 'announcement':
        return {
          title: textData.title || config.defaults?.title || 'Your Title',
          description: textData.description || config.defaults?.description || 'Your description here',
          imagePreview: files.image?.preview || null
        };
      case 'persona':
        return {
          name: textData.name || config.defaults?.name || 'Customer Name',
          title: textData.title || config.defaults?.title || 'Job Title',
          industry: textData.industry || config.defaults?.industry || 'Industry'
        };
      case 'how-it-works':
        return {
          title: textData.title || config.defaults?.title || 'How It Works',
          description: textData.description || config.defaults?.description || 'Describe how it works',
          stepNumber: null, // No step number in this template
          subtitle: null, // No subtitle in this template
          imagePreview: files.image?.preview || null,
          showImage: showImage
        };
      case 'closing':
        return {
          title: textData.title || config.defaults?.title || 'Thank You',
          subtitle: textData.subtitle || config.defaults?.subtitle || 'Get in touch',
          email: textData.email || config.defaults?.email || 'your.email@company.com',
          teamName: textData.teamName || config.defaults?.teamName || 'Your Team',
          directorName: textData.directorName || config.defaults?.directorName || 'Your Name'
        };
      default:
        return {};
    }
  };

  // Render live preview section for templates that support it
  const renderLivePreview = () => {
    const overlayComponent = getOverlayComponent();
    const backgroundImage = files.image?.preview;
    const videoThumbnail = files.video?.thumbnail;
    
    // Use video thumbnail as background if available, otherwise use image
    const finalBackgroundImage = videoThumbnail || backgroundImage;
    // Don't show background for Intro template when overlayOnly is true
    const shouldSetBackground = overlayOnly && config.id === 'intro' ? false : !!finalBackgroundImage;
    
    return (
      <OverlayPreviewSection
        config={config}
        overlayComponent={overlayComponent}
        audioDuration={audioDuration}
        files={files}
        backgroundImage={finalBackgroundImage}
        shouldSetBackground={shouldSetBackground}
        showRestartButton={false}
        showDecorativeElements={true}
        className="modal-preview"
        overlayOnly={overlayOnly}
      />
    );
  };

  // Render overlay preview for simple overlay display
  const renderOverlayPreview = () => {
    const overlayComponent = getOverlayComponent();
    const videoThumbnail = files.video?.thumbnail;
    const imagePreview = files.image?.preview;
    const backgroundImage = videoThumbnail || imagePreview;
    // Don't show background for Intro template when overlayOnly is true
    const shouldSetBackground = overlayOnly && config.id === 'intro' ? false : !!backgroundImage;
    
    return (
      <OverlayPreviewSection
        config={config}
        overlayComponent={overlayComponent}
        audioDuration={audioDuration}
        files={files}
        backgroundImage={backgroundImage}
        shouldSetBackground={shouldSetBackground}
        showRestartButton={false}
        showDecorativeElements={true}
        containerClassName={backgroundImage ? 'has-background' : ''}
        className="modal-preview"
        overlayOnly={overlayOnly}
      />
    );
  };

  // Render modal preview for video/image files
  const renderModalPreview = () => {
    if (!showPreview) return null;

    const previewFile = files.video || files.image;
    if (!previewFile?.preview) return null;

    // For video preview (intro template)
    if (config.id === 'intro' && files.video?.preview) {
      return (
        <div className="template-preview-modal">
          <div className="template-preview-content">
            <div className="template-preview-header">
              <h3>Intro Video Preview</h3>
              <Button variant="tertiary" onClick={onClose} className="btn--close">
                ×
              </Button>
            </div>
            
            <div className="template-preview-display">
              <div className="preview-media">
                <video 
                  src={files.video.preview} 
                  controls 
                  className="preview-video"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For image preview (persona)
    if (config.id === 'persona' && files.image?.preview) {
      return (
        <Suspense fallback={<div>Loading preview...</div>}>
          <PersonaPreview
            imageSrc={files.image.preview}
            onClose={onClose}
          />
        </Suspense>
      );
    }

    // Generic modal preview for other cases
    return (
      <div className="template-preview-modal">
        <div className="template-preview-content">
          <div className="template-preview-header">
            <h3>Preview</h3>
            <Button variant="tertiary" onClick={onClose} className="btn--close">
              ×
            </Button>
          </div>
          
          <div className="template-preview-display">
            {previewFile.preview && (
              <div className="preview-media">
                {files.video ? (
                  <video 
                    src={previewFile.preview} 
                    controls 
                    className="preview-video"
                  />
                ) : (
                  <img 
                    src={previewFile.preview} 
                    alt="Preview" 
                    className="preview-image"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Determine which preview type to render based on config
  const renderPreview = () => {
    switch (preview.type) {
      case 'live':
        return renderLivePreview();
      case 'video':
      case 'image':
        return renderOverlayPreview();
      default:
        return null;
    }
  };

  return (
    <>
      {renderPreview()}
      {renderModalPreview()}
    </>
  );
}
