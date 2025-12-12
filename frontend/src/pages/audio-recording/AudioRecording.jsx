import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioRecorder from '@/components/shared/audio-recorder';
import Button from '@/components/shared/button';
import { enhanceAudioRequest } from '@/services/audioEnhancement';
import './AudioRecording.scss';

export default function AudioRecording() {
  const navigate = useNavigate();
  const [latestRecording, setLatestRecording] = useState(null);

  const handleRecordingComplete = (payload) => {
    if (!payload?.file) return;

    const sizeInMb = payload.file.size / (1024 * 1024);
    setLatestRecording({
      ...payload,
      sizeLabel: `${sizeInMb.toFixed(2)} MB`,
      enhancements: []
    });
  };

  const handleOpenTrim = () => {
    if (!latestRecording) return;
    navigate('/trim', { state: { recording: latestRecording } });
  };

  const handleEnhanceRecording = async (payload) => {
    if (!payload?.file) {
      throw new Error('Please record audio before enhancing.');
    }

    const response = await enhanceAudioRequest(payload.file);
    const filename =
      response.filename || `enhanced-${payload.file.name || 'takeone-audio'}.webm`;
    const enhancedFile = new File([response.blob], filename, { type: response.contentType });
    const enhancedUrl = URL.createObjectURL(response.blob);

    const enhancedPayload = {
      file: enhancedFile,
      blob: response.blob,
      url: enhancedUrl,
      durationMs: response.durationMs ?? payload.durationMs,
      sizeLabel: `${(enhancedFile.size / (1024 * 1024)).toFixed(2)} MB`,
      enhancements: response.enhancements
    };

    setLatestRecording(prev => {
      if (prev?.url && prev.url !== enhancedUrl) {
        URL.revokeObjectURL(prev.url);
      }
      return enhancedPayload;
    });

    return enhancedPayload;
  };

  return (
    <div className="audio-recording-page">
      <section className="page-hero">
        <div>
          <p className="eyebrow">TakeOne Studio</p>
          <h1>Record pristine narration without leaving the builder</h1>
          <p>
            Capture a quick voice clip, download it, or hand it off to the Trim tool for final polish.
            This standalone recorder mirrors the experience that will soon live inside every audio upload step.
          </p>
        </div>
        <div className="hero-actions">
          <Button variant="secondary" onClick={() => navigate('/create')}>
            Back to Templates
          </Button>
          <Button variant="ghost" onClick={() => navigate('/trim')}>
            Open Trim Tool
          </Button>
        </div>
      </section>

      <AudioRecorder
        title="Microphone Recorder"
        description="Click start, speak naturally, then stop and review. Saved clips can immediately flow into Trim or any template’s audio slot."
        onRecordingComplete={handleRecordingComplete}
        onEnhance={handleEnhanceRecording}
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
              <Button variant="primary" onClick={handleOpenTrim}>
                Open in Trim Tool
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
              {latestRecording.enhancements?.length > 0 && (
                <div>
                  <span>Enhancements</span>
                  <strong>{latestRecording.enhancements.join(', ')}</strong>
                </div>
              )}
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
              <li>Trim silence or tighten pacing with the existing `/trim` route.</li>
              <li>Upload the exported clip inside any audio-capable template.</li>
              <li>Coming soon: embed this recorder directly alongside each “Upload Audio” dropzone.</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

