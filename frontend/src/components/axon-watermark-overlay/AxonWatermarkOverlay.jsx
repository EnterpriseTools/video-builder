import './AxonWatermarkOverlay.scss';

/**
 * AxonWatermarkOverlay Component
 * 
 * This component renders the Axon watermark overlay that will be applied
 * to all rendered videos. It mimics the Axon body camera watermark style.
 * 
 * Props:
 * - opacity: number (0-1, default: 0.7)
 * - size: 'small' | 'medium' | 'large' (default: 'medium')
 * - teamName: string (default: 'ENTERPRISE')
 */
export default function AxonWatermarkOverlay({ 
  opacity = 0.7, 
  size = 'medium',
  teamName = 'ENTERPRISE'
}) {
  // Get current date and time for the watermark
  const getCurrentTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div 
      className={`axon-watermark-overlay ${size}`}
      style={{ opacity }}
    >
      <div className="watermark-content">
        {/* Left side - Text information */}
        <div className="watermark-text">
          <div className="watermark-timestamp">{getCurrentTimestamp()}</div>
          <div className="watermark-device">AXON {teamName}</div>
        </div>
        
        {/* Right side - Axon logo */}
        <div className="watermark-logo">
          <img src="/axon-delta-yellow.png" alt="Axon" />
        </div>
      </div>
    </div>
  );
}

