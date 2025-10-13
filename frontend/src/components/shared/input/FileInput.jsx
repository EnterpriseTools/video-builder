import './FileInput.scss';

export default function FileInput({
  label,
  accept,
  onChange,
  disabled = false,
  error,
  required = false,
  multiple = false,
  dragAndDrop = true,
  uploadText = "Click to upload or drag and drop",
  className = '',
  id,
  ...props
}) {
  const inputId = id || `file-input-${Math.random().toString(36).substr(2, 9)}`;
  
  const handleChange = (e) => {
    if (disabled) return;
    onChange?.(e);
  };

  const handleDrop = (e) => {
    if (!dragAndDrop || disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Create a mock event object similar to input change event
      const mockEvent = {
        target: {
          files: multiple ? files : [files[0]]
        }
      };
      onChange?.(mockEvent);
    }
  };

  const handleDragOver = (e) => {
    if (!dragAndDrop || disabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const containerClass = [
    'file-input-container',
    error && 'file-input-container--error',
    disabled && 'file-input-container--disabled',
    className
  ].filter(Boolean).join(' ');

  const dropzoneClass = [
    'file-input-dropzone',
    disabled && 'file-input-dropzone--disabled'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {label && (
        <label htmlFor={inputId} className="file-input-label">
          {label}
          {required && <span className="file-input-required">*</span>}
        </label>
      )}
      
      <div 
        className={dropzoneClass}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && document.getElementById(inputId)?.click()}
      >
        <p className="file-input-text">{uploadText}</p>
        {accept && (
          <p className="file-input-hint">
            Accepted formats: {accept.replace(/\./g, '').replace(/,/g, ', ')}
          </p>
        )}
      </div>
      
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        multiple={multiple}
        className="file-input-hidden"
        {...props}
      />
      
      {error && (
        <span className="file-input-error">{error}</span>
      )}
    </div>
  );
}
