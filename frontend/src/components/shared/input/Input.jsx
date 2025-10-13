import './Input.scss';

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  error,
  required = false,
  size = 'medium',
  variant = 'default',
  className = '',
  id,
  multiline = false,
  rows = 4,
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const handleChange = (e) => {
    if (disabled) return;
    onChange?.(e);
  };

  const inputClass = [
    'input-field',
    `input-field--${variant}`,
    `input-field--${size}`,
    error && 'input-field--error',
    disabled && 'input-field--disabled',
    className
  ].filter(Boolean).join(' ');

  const containerClass = [
    'input-container',
    `input-container--${size}`,
    error && 'input-container--error'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      
      {multiline ? (
        <textarea
          id={inputId}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={inputClass}
          {...props}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
          {...props}
        />
      )}
      
      {error && (
        <span className="input-error">{error}</span>
      )}
    </div>
  );
}
