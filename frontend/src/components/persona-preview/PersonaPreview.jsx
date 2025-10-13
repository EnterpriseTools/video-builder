import { useRef } from 'react';
import Button from '@/components/shared/button';
import './PersonaPreview.scss';

export default function PersonaPreview({ imageSrc, onClose }) {
  return (
    <div className="persona-preview-modal">
      <div className="persona-preview-content">
        <div className="persona-preview-header">
          <h3>Image Preview</h3>
          <Button variant="tertiary" onClick={onClose} className="btn--close">
            ×
          </Button>
        </div>
        
        <div className="persona-preview-player">
          <div className="image-container">
            <img
              src={imageSrc}
              alt="Background preview"
              className="preview-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
}