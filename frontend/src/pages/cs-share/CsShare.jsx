import { useEffect, useState } from 'react';
import HeroLogo from '@/components/shared/HeroLogo';
import FileInput from '@/components/shared/input/FileInput';
import Button from '@/components/shared/button';
import { API_BASE_URL } from '@/lib/config';
import './CsShare.scss';

const MAX_IMAGE_SIZE_MB = 15;

export default function CsShare() {
  const [imageFile, setImageFile] = useState(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState('');
  const [processedPreview, setProcessedPreview] = useState('');
  const [error, setError] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // idle | processing | success | error
  const [analysisDetails, setAnalysisDetails] = useState({
    summary: '',
    highlightText: '',
    confidence: null,
    channel: '',
  });

  useEffect(() => {
    if (!imageFile) {
      setRawPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setRawPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const handleFileChange = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageFile(null);
      setError('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setImageFile(null);
      setError(`File exceeds ${MAX_IMAGE_SIZE_MB}MB. Please compress or choose a smaller asset.`);
      return;
    }

    setError('');
    setAnalysisError('');
    setAnalysisStatus('processing');
    setProcessedPreview('');
    setImageFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/cs-share/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        let parsedDetail = '';
        try {
          const parsed = JSON.parse(errorPayload);
          parsedDetail = parsed.detail || parsed.message || '';
        } catch {
          parsedDetail = errorPayload;
        }
        throw new Error(parsedDetail || 'Unable to analyze image.');
      }

      const data = await response.json();
      setProcessedPreview(data.croppedImage);
      setAnalysisDetails({
        summary: data.summary,
        highlightText: data.highlightText,
        confidence: data.confidence,
        channel: data.channel,
      });
      setAnalysisStatus('success');
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || 'Unexpected error while analyzing image.');
      setAnalysisStatus('error');
    }
  };

  const clearSelection = () => {
    setImageFile(null);
    setProcessedPreview('');
    setAnalysisDetails({
      summary: '',
      highlightText: '',
      confidence: null,
      channel: '',
    });
    setAnalysisStatus('idle');
    setAnalysisError('');
    setError('');
  };

  const formattedSize = imageFile
    ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB`
    : null;

  const previewUrl = processedPreview || rawPreviewUrl;

  const handleDownload = () => {
    if (!processedPreview) return;
    const link = document.createElement('a');
    link.href = processedPreview;
    const baseName = imageFile?.name?.replace(/\.[^.]+$/, '') || 'cs-share';
    link.download = `${baseName}-cropped.png`;
    link.click();
  };

  const renderStatusBanner = () => {
    if (analysisStatus === 'idle') return null;

    const statusMap = {
      processing: 'Analyzing screenshot with OpenAI…',
      success: 'Win confirmed! Highlight extracted.',
      error: analysisError || 'Unable to analyze this image.',
    };

    return (
      <div className={`analysis-banner analysis-banner--${analysisStatus}`}>
        {analysisStatus === 'processing' && <span className="dot-pulse" aria-hidden="true" />}
        <p>{statusMap[analysisStatus]}</p>
        {analysisStatus === 'error' && (
          <Button variant="tertiary" size="small" onClick={() => setAnalysisStatus('idle')}>
            Dismiss
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="cs-share-page">
      <div className="highlight-global" aria-hidden="true" />

      <div className="cs-share-container">
        <section className="cs-share-hero">
          <HeroLogo />

          <div className="cs-share-hero-copy">
            <span className="eyebrow">Case Study Share</span>
            <h1>Upload a shoutout</h1>
            <p>
              Drop Slack or email screenshots and we will isolate the customer win automatically.
              Chrome, sidebars, and browser bars vanish so you can showcase just the praise.
            </p>

            <ul className="cs-share-guidelines">
              <li>PNG, JPG, or WebP • {MAX_IMAGE_SIZE_MB}MB max</li>
              <li>We confirm the shoutout with GPT-4o before cropping</li>
              <li>Result replaces the original so you can download and share instantly</li>
            </ul>
          </div>
        </section>

        <section className="cs-share-upload">
          <div className="upload-card">
            <header>
              <div>
                <span className="eyebrow">Upload</span>
                <h2>Let’s highlight the win</h2>
                <p>Our analyzer trims distractions, verifies the praise, and keeps the best part.</p>
              </div>
              {imageFile && (
                <Button variant="tertiary" size="small" onClick={clearSelection}>
                  Replace image
                </Button>
              )}
            </header>

            {renderStatusBanner()}

            {!imageFile && (
              <FileInput
                accept="image/*"
                onChange={handleFileChange}
                multiple={false}
                uploadText="Click to upload or drag a hero image"
                required
                error={error}
              />
            )}

            {imageFile && previewUrl && (
              <div className="upload-preview">
                <div className="preview-media">
                  <img src={previewUrl} alt={imageFile?.name || 'Selected image preview'} />
                </div>
                <div className="preview-meta">
                  <div>
                    <p className="preview-name">{imageFile?.name}</p>
                    <p className="preview-size">{formattedSize}</p>
                  </div>
                  <div className="preview-actions">
                    <Button variant="destructive" size="small" onClick={clearSelection}>
                      Remove
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      disabled={!processedPreview || analysisStatus !== 'success'}
                      onClick={handleDownload}
                    >
                      Download Cropped Image
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {analysisStatus === 'success' && (
              <div className="analysis-summary">
                <div>
                  <span className="eyebrow">Summary</span>
                  <p className="analysis-summary__text">{analysisDetails.summary}</p>
                </div>
                <div className="analysis-summary__meta">
                  <p>
                    <strong>Confidence:</strong>{' '}
                    {analysisDetails.confidence ? `${Math.round(analysisDetails.confidence * 100)}%` : '—'}
                  </p>
                  <p>
                    <strong>Channel:</strong> {analysisDetails.channel || 'unknown'}
                  </p>
                  {analysisDetails.highlightText && (
                    <blockquote>&ldquo;{analysisDetails.highlightText}&rdquo;</blockquote>
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

