import { API_BASE_URL } from '@/lib/config';

const parseFilename = (response) => {
  const disposition = response.headers.get('content-disposition');
  if (!disposition) return null;
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(disposition);
  if (!match) return null;
  return decodeURIComponent(match[1] || match[2]);
};

export async function enhanceAudioRequest(file, { signal } = {}) {
  if (!file) {
    throw new Error('No audio file provided for enhancement.');
  }

  const formData = new FormData();
  formData.append('audio', file, file.name || 'takeone-audio.webm');

  const response = await fetch(`${API_BASE_URL}/audio/enhance`, {
    method: 'POST',
    body: formData,
    signal
  });

  if (!response.ok) {
    const message = (await response.text().catch(() => '')).trim();
    throw new Error(message || 'Failed to enhance audio. Please try again.');
  }

  const blob = await response.blob();
  const durationSeconds = Number(response.headers.get('X-Audio-Duration'));
  const enhancementsHeader = response.headers.get('X-Audio-Enhancements') || '';

  return {
    blob,
    filename: parseFilename(response) || `enhanced-${file.name || 'takeone-audio.webm'}`,
    contentType: response.headers.get('content-type') || 'audio/webm',
    durationMs: Number.isFinite(durationSeconds) ? durationSeconds * 1000 : undefined,
    enhancements: enhancementsHeader
      .split(',')
      .map(token => token.trim())
      .filter(Boolean)
  };
}

