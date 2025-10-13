import './AnnouncementOverlay.scss';

export default function AnnouncementOverlay({ title, description, imagePreview }) {
  return (
    <div className="announcement-overlay">
      {/* Left side content - text */}
      <div className="left-side-content">
        <div className="text-display-area">
          <div className="preview-title">{title || 'Enter announcement title...'}</div>
          <div className="preview-description">{description || 'Enter announcement description...'}</div>
        </div>
      </div>

      {/* Right side content - image */}
      <div className="right-side-content">
        <div className="image-container-preview">
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Featured" 
              className="preview-image"
            />
          ) : (
            <div className="image-placeholder">
              Upload an image to see preview
            </div>
          )}
        </div>
      </div>

      {/* Decorative elements - contained within announcement overlay */}
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
    </div>
  );
}
