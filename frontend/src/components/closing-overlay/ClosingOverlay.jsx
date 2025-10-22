import './ClosingOverlay.scss';

export default function ClosingOverlay({ title, subtitle, email, teamName }) {
  return (
    <div className="closing-overlay">
      {/* Axon logo container - matches backend placeholder */}
      <div className="axon-logo-container">
        <img src="/logoAxon.png" alt="Axon Logo" />
      </div>

      {/* Main title */}
      {title && (
        <div className="main-title">{title}</div>
      )}

      {/* Main subtitle */}
      {subtitle && (
        <div className="main-subtitle">{subtitle}</div>
      )}

      {/* Email */}
      {email && (
        <div className="main-email">{email}</div>
      )}

      {/* Bottom left content - team info */}
      <div className="bottom-left-content">
        <div className="team-info">
          {teamName && <div className="team-name">{teamName}</div>}
          {/* Show placeholder when no team name */}
          {!teamName && <div className="team-name">Enter team name...</div>}
        </div>
      </div>

      {/* Bottom right content - company info */}
      <div className="bottom-right-content">
        <div className="company-info">
          Axon Enterprise {new Date().getFullYear()}
        </div>
      </div>

      {/* Wave and highlight decorations are handled by TemplatePreview component */}
    </div>
  );
}
