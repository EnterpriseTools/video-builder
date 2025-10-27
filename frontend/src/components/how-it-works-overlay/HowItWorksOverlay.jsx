import './HowItWorksOverlay.scss';

export default function HowItWorksOverlay({ title, subtitle, stepNumber, description, imagePreview, showImage }) {
  return (
    <div className="how-it-works-overlay">
      <div className="how-it-works-card">
        <div className="how-it-works-content">
          {/* Show image if showImage is enabled and imagePreview exists */}
          {showImage && imagePreview && (
            <div className="how-it-works-image">
              <img src={imagePreview} alt="How it works visual" />
            </div>
          )}
          {stepNumber && <div className="step-number">{stepNumber}</div>}
          <div className="text-content">
            {title && <div className="how-it-works-title">{title}</div>}
            {subtitle && <div className="how-it-works-subtitle">{subtitle}</div>}
            {description && <div className="how-it-works-description">{description}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
