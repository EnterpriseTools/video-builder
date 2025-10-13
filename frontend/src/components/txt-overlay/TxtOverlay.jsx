import './TxtOverlay.scss';

export default function TxtOverlay({ team, fullName, role }) {
  return (
    <div className="txt-overlay">
      <div className="txt-card">
        <div className="txt-logo-container">
          <img src="/logoAxon.png" alt="Axon Logo" className="txt-logo" />
        </div>
        <div className="txt-text-container">
          {team && <div className="txt-team">{team}</div>}
          {fullName && <div className="txt-name">{fullName}</div>}
          {role && <div className="txt-role">{role}</div>}
        </div>
      </div>
    </div>
  );
}
