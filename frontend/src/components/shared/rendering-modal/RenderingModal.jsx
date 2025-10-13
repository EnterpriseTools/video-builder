import './RenderingModal.scss';

export default function RenderingModal({ 
  isVisible, 
  title = "Rendering Your Video", 
  description = "Processing video and adding overlays...", 
  note = "This may take a minute depending on video length" 
}) {
  if (!isVisible) return null;

  return (
    <div className="rendering-overlay">
      <div className="rendering-content">
        <div className="rendering-spinner"></div>
        <h3>{title}</h3>
        <p>{description}</p>
        {note && <p className="rendering-note">{note}</p>}
      </div>
    </div>
  );
}
