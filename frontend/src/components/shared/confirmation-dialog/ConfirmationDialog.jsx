import './ConfirmationDialog.scss';

/**
 * Reusable Confirmation Dialog Component
 * Shows a modal dialog for confirming actions like discarding unsaved changes
 */
export default function ConfirmationDialog({
  isVisible = false,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. What would you like to do?',
  cancelText = 'Cancel',
  discardText = 'Discard',
  onCancel,
  onDiscard,
  onOverlayClick
}) {
  if (!isVisible) return null;

  return (
    <div 
      className="confirmation-overlay" 
      onClick={(e) => {
        e.stopPropagation();
        if (onOverlayClick) onOverlayClick();
      }}
    >
      <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirmation-actions">
          <button className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn-discard" onClick={onDiscard}>
            {discardText}
          </button>
        </div>
      </div>
    </div>
  );
}

