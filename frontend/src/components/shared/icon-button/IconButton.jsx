import { useState } from 'react';
import './IconButton.scss';

export default function IconButton({
  icon,
  tooltip,
  onClick,
  variant = 'secondary',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e) => {
    if (disabled || loading) return;
    onClick?.(e);
  };

  return (
    <div className="icon-button-wrapper">
      <button
        className={`icon-button icon-button--${variant} ${disabled ? 'icon-button--disabled' : ''} ${loading ? 'icon-button--loading' : ''} ${className}`}
        onClick={handleClick}
        disabled={disabled || loading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        {...props}
      >
        {loading ? (
          <div className="icon-button__spinner">
            <div className="spinner-ring"></div>
          </div>
        ) : (
          <span className="icon-button__icon">{icon}</span>
        )}
      </button>
      {showTooltip && tooltip && !loading && (
        <div className="icon-button__tooltip">{tooltip}</div>
      )}
    </div>
  );
}

