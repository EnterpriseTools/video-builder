import { useEffect, useRef, useState } from 'react';
import './AudioWaveform.scss';

/**
 * Audio Waveform Visualization Component
 * Displays a waveform visualization for audio files
 */
export default function AudioWaveform({ audioFile, duration = 0 }) {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!audioFile || !canvasRef.current) return;

    const drawWaveform = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Read the audio file
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get channel data
        const channelData = audioBuffer.getChannelData(0);
        const samples = Math.floor(width / 2); // Number of bars to draw
        const blockSize = Math.floor(channelData.length / samples);
        
        // Clear canvas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, width / window.devicePixelRatio, height / window.devicePixelRatio);
        
        // Draw waveform
        ctx.fillStyle = '#646cff';
        const barWidth = (width / samples) / window.devicePixelRatio;
        const centerY = height / (2 * window.devicePixelRatio);
        
        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          
          // Average the block
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[blockStart + j]);
          }
          
          const average = sum / blockSize;
          const barHeight = (average * height) / (2 * window.devicePixelRatio);
          
          const x = i * barWidth;
          const y = centerY - barHeight / 2;
          
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error drawing waveform:', err);
        setError('Could not generate waveform visualization');
        setIsLoading(false);
        
        // Draw fallback bars
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, width / window.devicePixelRatio, height / window.devicePixelRatio);
        
        // Draw simple bars as fallback
        ctx.fillStyle = 'rgba(100, 108, 255, 0.3)';
        const barCount = 50;
        const barWidth = (width / barCount) / window.devicePixelRatio;
        const centerY = height / (2 * window.devicePixelRatio);
        
        for (let i = 0; i < barCount; i++) {
          const barHeight = Math.random() * (height / (2 * window.devicePixelRatio));
          const x = i * barWidth;
          const y = centerY - barHeight / 2;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
      }
    };

    drawWaveform();

    // Cleanup
    return () => {
      // Don't close the audio context as it may be reused
    };
  }, [audioFile]);

  return (
    <div className="audio-waveform">
      <div className="waveform-header">
        <h3>Audio Waveform</h3>
        {duration > 0 && (
          <span className="waveform-duration">
            {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="waveform-container">
        {isLoading && (
          <div className="waveform-loading">
            <div className="spinner"></div>
            <span>Generating waveform...</span>
          </div>
        )}
        <canvas 
          ref={canvasRef}
          className="waveform-canvas"
          style={{ opacity: isLoading ? 0.3 : 1 }}
        />
        {error && (
          <div className="waveform-error">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

