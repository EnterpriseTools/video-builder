import './HowItWorksOverlay.scss';

export default function HowItWorksOverlay({ title, subtitle, stepNumber, description }) {
  return (
    <div className="how-it-works-overlay">
      <div className="how-it-works-card">
        <div className="how-it-works-content">
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
