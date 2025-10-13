import './PersonaTxtOverlay.scss';

export default function PersonaTxtOverlay({ name, title, industry }) {
  return (
    <div className="persona-txt-overlay">
      <div className="persona-txt-card">
        <div className="persona-txt-text-container">
          {industry && <div className="persona-txt-industry">{industry}</div>}
          {name && <div className="persona-txt-name">{name}</div>}
          {title && <div className="persona-txt-title">{title}</div>}
        </div>
      </div>
    </div>
  );
}
