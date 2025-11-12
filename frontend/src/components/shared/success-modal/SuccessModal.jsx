import React, { useEffect } from 'react';
import './SuccessModal.scss';

export default function SuccessModal({
  isVisible,
  videoName,
  videoUrl,
  onClose
}) {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  // Cleanup video URL when modal closes
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  if (!isVisible) return null;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-modal-content">
          {/* Success Icon */}
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="32" fill="#19ed27" fillOpacity="0.1" />
              <circle cx="32" cy="32" r="28" fill="#19ed27" fillOpacity="0.2" />
              <path
                d="M20 32L28 40L44 24"
                stroke="#19ed27"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Success Message */}
          <h2>Your video is downloading!</h2>
          <p className="video-name">{videoName}</p>

          {/* Video Preview */}
          {videoUrl && (
            <div className="video-preview">
              <video
                src={videoUrl}
                controls
                preload="metadata"
                className="preview-video"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* Close Button */}
          <button className="btn-close-success" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

