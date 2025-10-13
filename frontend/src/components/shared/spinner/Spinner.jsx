import './Spinner.scss';

export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner" aria-live="polite" aria-busy="true">
      <div className="spinner__dot" />
      <span className="spinner__label">{label}</span>
    </div>
  );
}