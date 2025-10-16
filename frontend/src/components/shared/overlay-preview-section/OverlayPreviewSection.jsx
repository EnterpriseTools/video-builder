import { Suspense, useState, useEffect } from 'react';
import Spinner from '@/components/shared/spinner/Spinner';
import './OverlayPreviewSection.scss';

/**
 * Unified overlay preview section component
 * Replaces duplicate implementations across all templates
 */
export default function OverlayPreviewSection({
  // Required props
  config,
  overlayComponent,
  audioDuration = 0,
  
  // Content props
  title = null,
  description = null,
  
  // Background props
  files = {},
  backgroundImage = null,
  shouldSetBackground = true,
  
  // Feature flags
  showRestartButton = false,
  showDecorativeElements = true,
  
  // CSS class overrides
  containerClassName = "",
  className = ""
}) {
  // Track loading state for background image
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Restart functionality removed - previews now show static final state
  
  // Determine if decorative elements should be shown externally
  // Note: announcement template handles decorative elements internally
  const hasDecorativeElements = showDecorativeElements && 
    (config.id === 'how-it-works' || config.id === 'closing');
  
  // Use background image for all templates as intended
  const finalBackgroundImage = shouldSetBackground ? backgroundImage : null;
  
  // Reset loading state when background image changes
  useEffect(() => {
    if (finalBackgroundImage) {
      setImageLoaded(false);
      setImageLoading(true);
      
      // Preload the image
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setImageLoading(false);
      };
      img.onerror = () => {
        setImageLoaded(true); // Show preview anyway on error
        setImageLoading(false);
      };
      img.src = finalBackgroundImage;
    } else {
      // No background image, show immediately
      setImageLoaded(true);
      setImageLoading(false);
    }
  }, [finalBackgroundImage]);
  
  // Build container class names
  const containerClasses = [
    'overlay-preview-container',
    finalBackgroundImage ? 'has-background' : '',
    overlayComponent ? 'has-overlay-content' : '',
    containerClassName
  ].filter(Boolean).join(' ');
  
  return (
    <div className={`overlay-preview-section ${className}`}>
      {title && <h4>{title}</h4>}
      {description && <p>{description}</p>}
      
      <div 
        key={`preview-${audioDuration}`}
        className={containerClasses}
        data-template={config.id}
        style={{
          '--video-duration': `${audioDuration || 10}s`,
          '--outro-start': `${Math.max(0, ((audioDuration || 10) - 0.5) / (audioDuration || 10)) * 100}%`,
          ...(finalBackgroundImage && { backgroundImage: `url(${finalBackgroundImage})` })
        }}
      >
        {/* Show loading spinner while image is loading */}
        {imageLoading && finalBackgroundImage && (
          <div className="preview-loader">
            <Spinner />
          </div>
        )}
        
        {/* Show preview content once loaded */}
        {imageLoaded && (
          <div className="overlay-content">
            <Suspense fallback={<div>Loading preview...</div>}>
              {overlayComponent}
            </Suspense>
            
            {/* Add decorative elements for templates that support them */}
            {hasDecorativeElements && (
            <>
              <div 
                className="wave-element"
                style={{
                  position: 'absolute',
                  bottom: '-35%',
                  left: '-10%',
                  width: '120%',
                  zIndex: 10
                }}
              >
                <img 
                  src="/Wave.png" 
                  alt="Wave decoration"
                  style={{
                    width: '100%', 
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
              <div 
                className="highlight-element"
                style={{
                  position: 'absolute',
                  top: '-30%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 15
                }}
              >
                <img 
                  src="/highlight.png" 
                  alt="Highlight decoration"
                  style={{
                    width: 'auto', 
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            </>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
