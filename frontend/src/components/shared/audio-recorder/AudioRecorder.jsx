import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/shared/button';
import './AudioRecorder.scss';

const RECORDER_STATES = {
  IDLE: 'idle',
  PERMISSION: 'permission',
  RECORDING: 'recording',
  PREVIEW: 'preview',
  ERROR: 'error'
};

const RecordingSpinner = () => (
  <span className="recording-spinner" aria-hidden="true">
    <span />
    <span />
    <span />
  </span>
);

export default function AudioRecorder({
  title = 'Record Audio',
  description = 'Capture clean narration directly in TakeOne. You can re-record as many times as you like.',
  maxDurationMs = 5 * 60 * 1000, // 5 minutes
  autoDownload = false,
  allowDownload = true,
  onRecordingComplete,
  onEnhance
}) {
  const [recorderState, setRecorderState] = useState(RECORDER_STATES.IDLE);
  const [permissionError, setPermissionError] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingFile, setRecordingFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState('');

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const analyserCanvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  const formattedElapsed = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [elapsedMs]);

  const stopVisualization = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
  }, []);

  const teardownMedia = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    stopVisualization();
  }, [stopVisualization]);

  const resetRecording = useCallback(() => {
    teardownMedia();
    audioChunksRef.current = [];
    setElapsedMs(0);
    setRecordingUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setRecordingFile(null);
    setPermissionError('');
    setStatusMessage('');
    setEnhanceError('');
    setRecorderState(RECORDER_STATES.IDLE);
  }, [teardownMedia]);

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !analyserCanvasRef.current) return;
    const canvas = analyserCanvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = '#1a1d2b';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#8f9eff';
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / analyser.fftSize;
      let x = 0;
      for (let i = 0; i < analyser.fftSize; i += 1) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  }, []);

  const initVisualizer = useCallback(async (stream) => {
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;

    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);

    const bufferLength = analyserRef.current.fftSize;
    dataArrayRef.current = new Uint8Array(bufferLength);
    drawWaveform();
  }, [drawWaveform]);

  const handleDataAvailable = useCallback((event) => {
    if (event.data?.size > 0) {
      audioChunksRef.current.push(event.data);
    }
  }, []);

  const finishRecording = useCallback(() => {
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const fileName = `takeone-audio-${Date.now()}.webm`;
    const file = new File([blob], fileName, { type: blob.type });
    const url = URL.createObjectURL(blob);

    setRecordingUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setRecordingFile(file);
    setRecorderState(RECORDER_STATES.PREVIEW);

    if (autoDownload) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
    }

  }, [autoDownload, elapsedMs, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.removeEventListener('dataavailable', handleDataAvailable);
    mediaRecorderRef.current.addEventListener('stop', finishRecording, { once: true });
    mediaRecorderRef.current.stop();
    teardownMedia();
    setStatusMessage('Processing recording…');
  }, [finishRecording, handleDataAvailable, teardownMedia]);

  const startRecording = useCallback(async () => {
    try {
      setPermissionError('');
      setStatusMessage('Requesting microphone access…');
      setRecorderState(RECORDER_STATES.PERMISSION);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];
      mediaRecorder.addEventListener('dataavailable', handleDataAvailable);

      mediaRecorder.start(250);
      setRecorderState(RECORDER_STATES.RECORDING);
      setStatusMessage('Recording…');
      startTimeRef.current = performance.now();
      setElapsedMs(0);

      timerIntervalRef.current = setInterval(() => {
        setElapsedMs(performance.now() - startTimeRef.current);
      }, 200);

      mediaRecorder.addEventListener('stop', () => {
        setStatusMessage('');
      });

      initVisualizer(stream);
    } catch (error) {
      console.error('Microphone permission error:', error);
      setPermissionError(
        error?.message ||
          'Unable to access your microphone. Please verify browser permissions and try again.'
      );
      setRecorderState(RECORDER_STATES.ERROR);
      teardownMedia();
    }
  }, [handleDataAvailable, initVisualizer, teardownMedia]);

  useEffect(() => {
    if (recorderState === RECORDER_STATES.RECORDING && elapsedMs >= maxDurationMs) {
      stopRecording();
      setStatusMessage('Reached maximum duration');
    }
  }, [elapsedMs, maxDurationMs, recorderState, stopRecording]);

  useEffect(() => () => {
    resetRecording();
  }, [resetRecording]);

  const canRecord = recorderState === RECORDER_STATES.IDLE || recorderState === RECORDER_STATES.ERROR;
  const isRecording = recorderState === RECORDER_STATES.RECORDING;
  const canPreview = recorderState === RECORDER_STATES.PREVIEW && recordingUrl;

  const handleEnhance = useCallback(async () => {
    if (!recordingFile || typeof onEnhance !== 'function' || isEnhancing) return;

    setEnhanceError('');
    setIsEnhancing(true);

    try {
      const enhancedPayload = await onEnhance({
        file: recordingFile,
        url: recordingUrl,
        durationMs: elapsedMs
      });

      if (enhancedPayload?.file && enhancedPayload?.url) {
        setRecordingFile(enhancedPayload.file);
        setElapsedMs(enhancedPayload.durationMs ?? elapsedMs);
        setRecordingUrl(prev => {
          if (prev && prev !== enhancedPayload.url) {
            URL.revokeObjectURL(prev);
          }
          return enhancedPayload.url;
        });
      }
    } catch (error) {
      setEnhanceError(error?.message || 'Unable to enhance this recording. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  }, [elapsedMs, isEnhancing, onEnhance, recordingFile, recordingUrl]);

  return (
    <div className="audio-recorder">
      <div className="audio-recorder__card">
        <header>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <span className={`status-chip status-${recorderState}`}>
            {recorderState === RECORDER_STATES.RECORDING && (
              <>
                <span className="live-dot" /> Recording
              </>
            )}
            {recorderState === RECORDER_STATES.PREVIEW && 'Preview'}
            {recorderState === RECORDER_STATES.PERMISSION && 'Awaiting permission'}
            {recorderState === RECORDER_STATES.ERROR && 'Error'}
            {recorderState === RECORDER_STATES.IDLE && 'Ready'}
          </span>
        </header>

        <section className="recorder-stage">
          <div className="recorder-display">
            <canvas
              ref={analyserCanvasRef}
              className={`waveform ${isRecording ? 'active' : ''}`}
              width={560}
              height={140}
            />

            <div className="timer-row">
              <div className="timer">
                {isRecording && <RecordingSpinner />}
                <span>{formattedElapsed}</span>
              </div>
              <span className="hint">Max {Math.floor(maxDurationMs / 60000)} min</span>
            </div>

            {permissionError && <p className="error-message">{permissionError}</p>}
            {statusMessage && !permissionError && <p className="status-message">{statusMessage}</p>}
            {enhanceError && <p className="error-message">{enhanceError}</p>}
          </div>

          <div className="recorder-actions">
            {canRecord && (
              <Button variant="primary" size="large" onClick={startRecording}>
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button variant="destructive" size="large" onClick={stopRecording}>
                Stop Recording
              </Button>
            )}

            {canPreview && (
              <div className="preview-controls">
                <audio controls src={recordingUrl} preload="metadata">
                  Your browser does not support the audio element.
                </audio>

                <div className="button-row">
                  <Button variant="secondary" onClick={resetRecording} disabled={isEnhancing}>
                    Record Again
                  </Button>
                  {allowDownload && recordingFile && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = recordingUrl;
                        link.download = recordingFile.name;
                        link.click();
                      }}
                      disabled={isEnhancing}
                    >
                      Download
                    </Button>
                  )}
                  {typeof onEnhance === 'function' && (
                    <Button
                      variant="ghost"
                      onClick={handleEnhance}
                      disabled={!recordingFile || isEnhancing}
                    >
                      {isEnhancing ? 'Enhancing…' : 'Enhance'}
                    </Button>
                  )}
                  {typeof onRecordingComplete === 'function' && (
                    <Button
                      variant="success"
                      disabled={isEnhancing}
                      onClick={() =>
                        onRecordingComplete({
                          file: recordingFile,
                          blob: recordingFile
                            ? recordingFile.slice(0, recordingFile.size, recordingFile.type)
                            : null,
                          url: recordingUrl,
                          durationMs: elapsedMs
                        })
                      }
                    >
                      Save Recording
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

