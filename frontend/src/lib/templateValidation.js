/**
 * Shared validation utilities for video template processing
 */

/**
 * Validates file type for different media types
 * @param {File} file - The file to validate
 * @param {string} type - The expected type ('image', 'audio', 'video', 'media')
 * @returns {Object} - { isValid: boolean, error: string }
 */
export function validateFileType(file, type) {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  const fileName = file.name.toLowerCase();
  
  switch (type) {
    case 'image':
      if (!file.type.startsWith('image/')) {
        return { isValid: false, error: 'Please upload an image file (JPG, PNG, etc.)' };
      }
      break;
      
    case 'video':
      if (!fileName.endsWith('.mov') && !fileName.endsWith('.mp4')) {
        return { isValid: false, error: 'Please upload a .mov or .mp4 file' };
      }
      break;
      
    case 'audio':
      const audioExtensions = ['.mp3', '.wav', '.aifc', '.aiff', '.m4a'];
      const isAudioType = file.type.startsWith('audio/');
      const hasAudioExtension = audioExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isAudioType && !hasAudioExtension) {
        return { isValid: false, error: 'Please upload an audio file (.mp3, .wav, .aifc, .aiff, .m4a)' };
      }
      break;
      
    case 'media': // Audio OR video files
      const mediaExtensions = ['.mp3', '.wav', '.aifc', '.aiff', '.m4a', '.mov', '.mp4'];
      const isMediaAudioType = file.type.startsWith('audio/');
      const isMediaVideoType = file.type.startsWith('video/');
      const hasMediaExtension = mediaExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isMediaAudioType && !isMediaVideoType && !hasMediaExtension) {
        return { 
          isValid: false, 
          error: 'Please upload an audio file (MP3, WAV, AIFC) or video file (MOV, MP4) - we\'ll use the audio track' 
        };
      }
      break;
      
    default:
      return { isValid: false, error: 'Unknown file type validation' };
  }
  
  return { isValid: true, error: null };
}

/**
 * Generates a thumbnail for a video file
 * @param {File} file - The video file
 * @returns {Promise<string>} - Data URL of the thumbnail
 */
export function generateVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.src = url;
    video.currentTime = 1; // Seek to 1 second
    
    video.addEventListener('loadeddata', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 320, 180);
      const thumbnailUrl = canvas.toDataURL('image/jpeg');
      URL.revokeObjectURL(url);
      resolve(thumbnailUrl);
    });
    
    video.addEventListener('error', (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    });
  });
}

/**
 * Gets the duration of a media file (audio or video)
 * @param {File} file - The media file
 * @returns {Promise<number>} - Duration in seconds
 */
export function getMediaDuration(file) {
  return new Promise((resolve, reject) => {
    // Check for known unsupported audio formats first
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const knownUnsupportedFormats = ['aifc', 'aiff'];
    
    if (knownUnsupportedFormats.includes(fileExtension)) {
      reject(new Error(`Audio format .${fileExtension} not supported by browser (backend will handle duration)`));
      return;
    }
    
    const url = URL.createObjectURL(file);
    const fileName = file.name.toLowerCase();
    
    // Check if it's a video file
    if (file.type.startsWith('video/') || fileName.endsWith('.mov') || fileName.endsWith('.mp4')) {
      const video = document.createElement('video');
      video.src = url;
      
      video.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      });
      
      video.addEventListener('error', () => {
        // Fallback to audio element if video fails
        const audio = document.createElement('audio');
        audio.src = url;
        audio.addEventListener('loadedmetadata', () => {
          URL.revokeObjectURL(url);
          resolve(audio.duration);
        });
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          reject(new Error('Could not load video file for duration detection'));
        });
      });
    } else {
      // Use audio element for audio files
      const audio = document.createElement('audio');
      audio.src = url;
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        // Provide more specific error message for unsupported formats
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const isUnsupportedAudio = ['aifc', 'aiff'].includes(fileExtension);
        
        if (isUnsupportedAudio) {
          reject(new Error(`Audio format .${fileExtension} not supported by browser (backend will handle duration)`));
        } else {
          reject(new Error('Could not load audio file'));
        }
      });
    }
  });
}

/**
 * Creates a preview URL for a file
 * @param {File} file - The file to create preview for
 * @returns {string} - Object URL for preview
 */
export function createFilePreview(file) {
  // For images, use FileReader to create a data URL (more reliable than blob URLs)
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = () => {
        // Fallback to blob URL if FileReader fails
        const url = URL.createObjectURL(file);
        resolve(url);
      };
      reader.readAsDataURL(file);
    });
  }
  
  // For non-images, use blob URL
  return URL.createObjectURL(file);
}

/**
 * Downloads a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats duration in seconds to MM:SS format
 * @param {number} duration - Duration in seconds
 * @returns {string} - Formatted duration string
 */
export function formatDuration(duration) {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
