import React, { useEffect, useState } from 'react';
import './SuccessModal.scss';
import { API_BASE_URL } from '../../../lib/config';

export default function SuccessModal({
  isVisible,
  videoName,
  videoUrl,
  onClose
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [shareSuccess, setShareSuccess] = useState(false);

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

  // Reset share state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setShareError(null);
      setShareSuccess(false);
    }
  }, [isVisible]);

  // Handle share to Slack
  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    setShareError(null);
    setShareSuccess(false);

    try {
      // Fetch the video blob from the URL
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', blob, videoName);
      formData.append('filename', videoName);
      formData.append('initial_comment', `🎬 New video generated: ${videoName}`);

      // Upload to Slack via backend API
      const uploadResponse = await fetch(`${API_BASE_URL}/share-to-slack`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to share to Slack');
      }

      const result = await uploadResponse.json();
      console.log('Slack upload successful:', result);
      
      setShareSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setShareSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error sharing to Slack:', error);
      setShareError(error.message || 'Failed to share to Slack');
    } finally {
      setIsSharing(false);
    }
  };

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
        {/* Close X Button */}
        <button className="modal-close-x" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

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

          {/* Share Button */}
          <button 
            className={`share-button ${shareSuccess ? 'success' : ''}`}
            onClick={handleShare} 
            data-tooltip={shareSuccess ? "Shared!" : "Share your video to Slack"}
            disabled={isSharing}
          >
            {isSharing ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="0">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Sharing...
              </>
            ) : shareSuccess ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Shared to Slack!
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08259 9.19346C7.54305 8.46607 6.71531 8 5.77778 8C4.24803 8 3 9.34315 3 11C3 12.6569 4.24803 14 5.77778 14C6.71531 14 7.54305 13.5339 8.08259 12.8065L15.0227 16.6294C15.0077 16.7508 15 16.8745 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.0625 14 16.2347 14.4661 15.6952 15.1935L8.75514 11.3706C8.77018 11.2492 8.77778 11.1255 8.77778 11C8.77778 10.8745 8.77018 10.7508 8.75514 10.6294L15.6952 6.80654C16.2347 7.53393 17.0625 8 18 8Z" fill="currentColor"/>
                </svg>
                Share to Slack
              </>
            )}
          </button>

          {/* Error Message */}
          {shareError && (
            <div className="share-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{shareError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

