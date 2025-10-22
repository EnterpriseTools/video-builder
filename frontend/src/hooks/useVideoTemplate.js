import { useState, useCallback } from 'react';
import { 
  validateFileType, 
  generateVideoThumbnail, 
  getMediaDuration, 
  createFilePreview,
  downloadBlob,
  formatDuration 
} from '@/lib/templateValidation';

/**
 * Custom hook for managing video template state and operations
 * @param {Object} config - Template configuration object
 * @returns {Object} - Hook state and methods
 */
export function useVideoTemplate(config) {
  // Initialize text data with saved data (if editing) or defaults
  const [textData, setTextData] = useState(() => {
    // If editing with saved data, use that
    if (config.initialData?.textData) {
      return { ...config.initialData.textData };
    }
    
    // Otherwise use defaults
    const initialData = { ...config.defaults };
    // Apply default values from field configs
    config.textFields.forEach(field => {
      if (field.defaultValue && !initialData[field.id]) {
        initialData[field.id] = field.defaultValue;
      }
    });
    return initialData;
  });

  // File states - organized by file type
  const [files, setFiles] = useState(() => {
    const initialFiles = {};
    config.files.forEach(fileConfig => {
      // If editing with saved data, restore file info
      if (config.initialData?.files?.[fileConfig.id]?.file) {
        initialFiles[fileConfig.id] = {
          ...config.initialData.files[fileConfig.id]
        };
      } else {
        initialFiles[fileConfig.id] = {
          file: null,
          name: null,
          preview: null,
          duration: 0,
          thumbnail: null
        };
      }
    });
    return initialFiles;
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Helper function to update file state
  const updateFileState = useCallback((fileId, updates) => {
    setFiles(prev => ({
      ...prev,
      [fileId]: { ...prev[fileId], ...updates }
    }));
  }, []);

  // Computed values (defined early to avoid circular dependencies)
  const hasTextData = useCallback(() => {
    return Object.values(textData).some(value => value && value.trim());
  }, [textData]);

  const hasRequiredFiles = useCallback(() => {
    return config.files
      .filter(fileConfig => fileConfig.required)
      .every(fileConfig => files[fileConfig.id].file);
  }, [config.files, files]);

  const hasRequiredTextFields = useCallback(() => {
    return config.textFields
      .filter(field => field.required)
      .every(field => textData[field.id] && textData[field.id].trim());
  }, [config.textFields, textData]);

  const canRender = useCallback(() => {
    return hasRequiredFiles() && hasRequiredTextFields();
  }, [hasRequiredFiles, hasRequiredTextFields]);

  // Handle file uploads
  const handleFileUpload = useCallback(async (fileId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileConfig = config.files.find(f => f.id === fileId);
    if (!fileConfig) {
      setError(`Unknown file type: ${fileId}`);
      return;
    }

    // Validate file type
    const validation = validateFileType(file, fileConfig.type);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setError('');
    
    // Update basic file info
    updateFileState(fileId, {
      file,
      name: file.name,
      preview: null,
      duration: 0,
      thumbnail: null
    });

    try {
      // Create preview for images
      if (fileConfig.type === 'image') {
        const previewPromise = createFilePreview(file);
        
        if (previewPromise instanceof Promise) {
          previewPromise.then(preview => {
            updateFileState(fileId, { preview });
          });
        } else {
          // Fallback for non-promise return
          updateFileState(fileId, { preview: previewPromise });
        }
      }

      // Create video preview and thumbnail
      if (fileConfig.type === 'video') {
        const preview = createFilePreview(file);
        const thumbnail = await generateVideoThumbnail(file);
        updateFileState(fileId, { preview, thumbnail });
      }

      // Get duration for media files
      if (fileConfig.type === 'media' || fileConfig.type === 'video') {
        try {
          const duration = await getMediaDuration(file);
          updateFileState(fileId, { duration });
        } catch (durationError) {
          // Some audio formats (like .aifc) aren't supported by browser Audio API
          // This is expected and doesn't affect video rendering (backend handles duration)
          const isAudioFormat = file.type.startsWith('audio/') || 
                               file.name.toLowerCase().match(/\.(aifc|aiff|wav|mp3|m4a)$/);
          
          if (isAudioFormat) {
            console.debug(`Audio format ${file.name} not supported by browser for duration detection. Backend will handle this.`);
          } else {
            console.warn('Could not get media duration:', durationError);
          }
          // Don't set error for duration issues, just continue without it
        }
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error processing file. Please try again.');
    }
  }, [config.files, updateFileState]);

  // Handle text data changes
  const handleTextChange = useCallback((fieldId, value) => {
    setTextData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
  }, []);

  // Clear a specific file
  const handleClearFile = useCallback((fileId) => {
    const currentFile = files[fileId];
    
    // Revoke preview URLs to free memory
    if (currentFile.preview) {
      URL.revokeObjectURL(currentFile.preview);
    }
    
    updateFileState(fileId, {
      file: null,
      name: null,
      preview: null,
      duration: 0,
      thumbnail: null
    });
    
    setError('');
  }, [files, updateFileState]);


  // Render video
  const renderVideo = useCallback(async () => {
    // Validate required files
    const missingFiles = config.files
      .filter(fileConfig => fileConfig.required)
      .filter(fileConfig => !files[fileConfig.id].file);

    // Validate required text fields
    const missingTextFields = config.textFields
      .filter(field => field.required)
      .filter(field => !textData[field.id] || !textData[field.id].trim());

    const missingItems = [];
    if (missingFiles.length > 0) {
      missingItems.push(...missingFiles.map(f => f.label.toLowerCase()));
    }
    if (missingTextFields.length > 0) {
      missingItems.push(...missingTextFields.map(f => f.label.toLowerCase()));
    }

    if (missingItems.length > 0) {
      const itemNames = missingItems.join(', ');
      setError(`Please fill out required fields: ${itemNames}`);
      return;
    }

    // Check if we should intercept the render action (for modal use)
    if (config.onRenderIntercept) {
      const templateData = {
        textData,
        files,
        config: config
      };
      config.onRenderIntercept(templateData);
      return;
    }

    setRendering(true);
    setError('');

    try {
      const formData = new FormData();
      
      // Add files to form data
      Object.entries(files).forEach(([fileId, fileData]) => {
        if (fileData.file) {
          formData.append(fileId, fileData.file);
          
          // Add duration if available
          if (fileData.duration > 0) {
            formData.append('duration', fileData.duration.toString());
          }
        }
      });
      
      // Add text data to form
      Object.entries(textData).forEach(([key, value]) => {
        // For closing template, use default values if field is empty
        let finalValue = value || '';
        if (config.id === 'closing' && !value) {
          const field = config.textFields.find(f => f.id === key);
          if (field?.defaultValue) {
            finalValue = field.defaultValue;
          }
        }
        formData.append(key, finalValue);
      });

      const response = await fetch(config.api.render, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Render failed: ${errorText}`);
      }

      // Download the rendered video
      const blob = await response.blob();
      const mainField = config.textFields[0]?.id || 'video';
      const mainValue = textData[mainField] || 'video';
      const filename = `${config.id}-${mainValue}.mp4`;
      
      downloadBlob(blob, filename);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setRendering(false);
    }
  }, [config, files, textData]);

  // Preview handlers
  const handlePreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  // Format duration helper
  const getFormattedDuration = useCallback((fileId) => {
    const duration = files[fileId]?.duration || 0;
    return duration > 0 ? formatDuration(duration) : '';
  }, [files]);

  // Cleanup function for component unmount
  const cleanup = useCallback(() => {
    // Revoke all object URLs to prevent memory leaks
    Object.values(files).forEach(fileData => {
      if (fileData.preview) {
        URL.revokeObjectURL(fileData.preview);
      }
    });
    
  }, [files]);

  return {
    // State
    textData,
    files,
    loading,
    rendering,
    error,
    showPreview,

    // File handlers
    handleFileUpload,
    handleClearFile,

    // Text handlers
    handleTextChange,

    // Render handlers
    renderVideo,

    // Preview handlers
    handlePreview,
    closePreview,

    // Computed values
    hasTextData: hasTextData(),
    hasRequiredFiles: hasRequiredFiles(),
    canRender: canRender(),

    // Utilities
    getFormattedDuration,
    cleanup,

    // Direct state setters for special cases
    setError,
    setShowPreview
  };
}
