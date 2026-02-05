import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioRecorder from '@/components/shared/audio-recorder';
import Button from '@/components/shared/button';
import './AudioRecording.scss';

export default function AudioRecording() {
  const navigate = useNavigate();
  const [latestRecording, setLatestRecording] = useState(null);

  const handleRecordingComplete = (payload) => {
    if (!payload?.file) return;

    const sizeInMb = payload.file.size / (1024 * 1024);
    setLatestRecording({
      ...payload,
      sizeLabel: `${sizeInMb.toFixed(2)} MB`
    });
  };

  return (
    <div className="audio-recording-page">
      <section className="page-hero">
        <div>
          <p className="eyebrow">TakeOne Studio</p>
          <h1>Record pristine narration without leaving the builder</h1>
          <p>
            Capture a quick voice clip, download it, or drop it directly into any template. In-template trim controls stay available once you upload the file.
            This standalone recorder mirrors the experience that will soon live inside every audio upload step.
          </p>
        </div>
        <div className="hero-actions">
          <Button variant="secondary" onClick={() => navigate('/create')}>
            Back to Templates
          </Button>
        </div>
      </section>

      <AudioRecorder
        title="Microphone Recorder"
        description="Click start, speak naturally, then stop and review. Saved clips can immediately flow into any template’s audio slot."
        onRecordingComplete={handleRecordingComplete}
        allowDownload
      />

      {latestRecording && (
        <section className="recording-summary">
          <div className="summary-card">
            <header>
              <div>
                <p className="eyebrow">Latest recording</p>
                <h2>{latestRecording.file?.name}</h2>
              </div>
              <Button variant="primary" onClick={() => navigate('/create')}>
                Upload in Templates
              </Button>
            </header>

            <div className="summary-grid">
              <div>
                <span>Length</span>
                <strong>{Math.round((latestRecording.durationMs ?? 0) / 1000)}s</strong>
              </div>
              <div>
                <span>Size</span>
                <strong>{latestRecording.sizeLabel}</strong>
              </div>
              <div>
                <span>Format</span>
                <strong>{latestRecording.file?.type || 'audio/webm'}</strong>
              </div>
            </div>

            <div className="summary-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = latestRecording.url;
                  link.download = latestRecording.file?.name || 'takeone-audio.webm';
                  link.click();
                }}
              >
                Download
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (latestRecording?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(latestRecording.url);
                  }
                  setLatestRecording(null);
                }}
              >
                Clear Summary
              </Button>
            </div>
          </div>

          <div className="helper-card">
            <h3>What’s next?</h3>
            <ul>
              <li>Trim silence or tighten pacing using the per-file controls inside VideoTemplateCreator.</li>
              <li>Upload the exported clip inside any audio-capable template.</li>
              <li>Coming soon: embed this recorder directly alongside each “Upload Audio” dropzone.</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

