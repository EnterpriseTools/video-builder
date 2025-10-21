/**
 * Configuration objects for different video template types
 */

import { API_BASE_URL } from './config';

export const TEMPLATE_CONFIGS = {
  intro: {
    id: 'intro',
    name: 'Introduction',
    description: 'Introduce yourself, your team and your role.',
    
    // Section headers for new layout
    sectionHeaders: {
      files: 'Upload video:',
      text: 'Drop your deets:'
    },
    
    // Tooltip information for section headers
    tooltips: {
      files: 'Upload your introduction video file. Supported formats: .mov, .mp4. This will be the main content of your video.',
      text: 'Add personal information that will appear as text overlays on your video. All fields are optional but help personalize your introduction.'
    },
    
    // File requirements
    files: [
      {
        id: 'video',
        label: 'Introduction Video',
        description: 'Upload your intro video and add team information',
        type: 'video',
        accept: '.mov,.mp4',
        required: true,
        uploadText: 'Click to upload video'
      }
    ],
    
    // Text fields configuration
    textFields: [
      {
        id: 'team',
        label: 'Team',
        placeholder: 'Enter team name',
        required: false
      },
      {
        id: 'full_name',
        label: 'Full Name',
        placeholder: 'Enter full name',
        required: false
      },
      {
        id: 'role',
        label: 'Role',
        placeholder: 'Enter role/position',
        required: false
      }
    ],
    
    // API endpoints
    api: {
      render: `${API_BASE_URL}/api/intro/render`
    },
    
    // Default values
    defaults: {
      team: '',
      full_name: '',
      role: ''
    },
    
    // Preview configuration
    preview: {
      type: 'video',
      overlayComponent: 'TxtOverlay'
    },
    
    // Feature flags
    features: {
      showPngPreview: false, // Hide PNG preview section for intro template
      showVideoPreviewButton: false // Hide "Preview Video" button for intro template
    }
  },

  announcement: {
    id: 'announcement',
    name: 'Announcement Video Creator',
    description: 'Create professional announcement videos with animated text overlays',
    
    // Section headers for new layout
    sectionHeaders: {
      files: 'Upload your assets:',
      text: 'Add announcement details:'
    },
    
    // Tooltip information for section headers
    tooltips: {
      files: 'Upload a featured image and audio/video file. The image will be displayed while your audio plays, creating an engaging announcement video.',
      text: 'Add title and description text that will appear as animated overlays on your announcement video.'
    },
    
    files: [
      {
        id: 'image',
        label: 'Featured Image',
        description: 'Upload image thumbnail, audio file, and add announcement information',
        type: 'image',
        accept: 'image/*',
        required: true,
        uploadText: 'Click to upload image'
      },
      {
        id: 'audio',
        label: 'Audio Track (or Video)',
        description: null,
        type: 'media',
        accept: 'audio/*,video/*,.mp3,.wav,.aifc,.mov,.mp4',
        required: true,
        uploadText: 'Click to upload audio or video file'
      }
    ],
    
    textFields: [
      {
        id: 'title',
        label: 'Title',
        placeholder: 'Enter announcement title',
        required: false
      },
      {
        id: 'description',
        label: 'Description',
        placeholder: 'Enter description (optional)',
        required: false
      }
    ],
    
    api: {
      render: `${API_BASE_URL}/api/announcement/render`
    },
    
    defaults: {
      title: '',
      description: ''
    },
    
    preview: {
      type: 'image',
      overlayComponent: 'AnnouncementOverlay'
    },
    
    // Feature flags
    features: {
      showPngPreview: false, // Hide PNG preview section - was for debugging only
      showVideoPreviewButton: true
    }
  },

  'how-it-works': {
    id: 'how-it-works',
    name: 'Title Video Creator',
    description: 'Create simple tutorial videos with title and description overlays',
    
    // Section headers for new layout
    sectionHeaders: {
      files: 'Upload audio:',
      text: 'Add tutorial details:'
    },
    
    // Tooltip information for section headers
    tooltips: {
      files: 'Upload an audio or video file that will serve as the background audio for your tutorial. The video length will match your audio duration.',
      text: 'Add tutorial title and description that will appear as overlays. Perfect for explaining processes or features step-by-step.'
    },
    
    files: [
      {
        id: 'audio',
        label: 'Audio Track (or Video)',
        description: 'Upload audio file and add title and description',
        type: 'media',
        accept: 'audio/*,video/*,.mp3,.wav,.aifc,.mov,.mp4',
        required: true,
        uploadText: 'Click to upload audio or video file'
      }
    ],
    
    textFields: [
      {
        id: 'title',
        label: 'Title',
        placeholder: 'Enter tutorial title',
        required: false,
        defaultValue: 'How It Works'
      },
      {
        id: 'description',
        label: 'Description',
        placeholder: 'Enter tutorial description (optional)',
        required: false
      }
    ],
    
    api: {
      render: `${API_BASE_URL}/api/how-it-works/render`
    },
    
    defaults: {
      title: 'How It Works',
      description: ''
    },
    
    preview: {
      type: 'live',
      overlayComponent: 'HowItWorksOverlay'
    },
    
    // Feature flags
    features: {
      showPngPreview: false, // Hide PNG preview section - was for debugging only
      showVideoPreviewButton: true
    }
  },

  persona: {
    id: 'persona',
    name: 'Persona Video Creator',
    description: 'Create professional persona introduction videos with fullscreen images and audio',
    
    // Section headers for new layout
    sectionHeaders: {
      files: 'Upload your assets:',
      text: 'Add persona details:'
    },
    
    // Tooltip information for section headers
    tooltips: {
      files: 'Upload a background image and audio file. The image will fill the screen while your audio plays, creating a professional persona introduction.',
      text: 'Add personal details like name, title, and industry description. These will appear as elegant text overlays on your background image.'
    },
    
    files: [
      {
        id: 'image',
        label: 'Background Image',
        description: 'Upload an image that will fill the entire screen',
        type: 'image',
        accept: 'image/*',
        required: true,
        uploadText: 'Click to upload background image'
      },
      {
        id: 'audio',
        label: 'Audio Track',
        description: 'Upload audio that will determine the video length',
        type: 'media',
        accept: 'audio/*,video/*,.mp3,.wav,.aifc,.aiff,.m4a,.mov,.mp4',
        required: true,
        uploadText: 'Click to upload audio or video file'
      }
    ],
    
    textFields: [
      {
        id: 'name',
        label: 'Name',
        placeholder: 'Enter person\'s name',
        required: false
      },
      {
        id: 'title',
        label: 'Title/Role',
        placeholder: 'Enter job title or role',
        required: false
      },
      {
        id: 'industry',
        label: 'Industry/Description',
        placeholder: 'Enter industry or description',
        required: false,
        multiline: true,
        rows: 4
      }
    ],
    
    api: {
      render: `${API_BASE_URL}/api/persona/render`
    },
    
    defaults: {
      name: '',
      title: '',
      industry: ''
    },
    
    preview: {
      type: 'image',
      overlayComponent: 'PersonaTxtOverlay'
    },
    
    // Feature flags
    features: {
      showPngPreview: false, // Hide PNG preview section - was for debugging only
      showVideoPreviewButton: true
    }
  },

  closing: {
    id: 'closing',
    name: 'Closing Video Creator',
    description: 'Create compelling conclusion videos with title and description overlays',
    
    // Section headers for new layout
    sectionHeaders: {
      files: 'Upload audio:',
      text: 'Add closing details:'
    },
    
    // Tooltip information for section headers
    tooltips: {
      files: 'Upload an audio or video file for your closing message. This sets the duration and background audio for your conclusion.',
      text: 'Add closing details like thank you message, contact information, and team details. Perfect for ending presentations professionally.'
    },
    
    files: [
      {
        id: 'audio',
        label: 'Audio Track (or Video)',
        description: 'Upload audio file and add closing title and description',
        type: 'media',
        accept: 'audio/*,video/*,.mp3,.wav,.aifc,.mov,.mp4',
        required: true,
        uploadText: 'Click to upload audio or video file'
      }
    ],
    
    textFields: [
      {
        id: 'title',
        label: 'Main Title',
        placeholder: 'Thank you.',
        required: false,
        defaultValue: 'Thank you.'
      },
      {
        id: 'subtitle',
        label: 'Subtitle',
        placeholder: 'If you have any questions:',
        required: false,
        defaultValue: 'If you have any questions:'
      },
      {
        id: 'email',
        label: 'Email Address',
        placeholder: 'Enter email address',
        required: false
      },
      {
        id: 'teamName',
        label: 'Team Name',
        placeholder: 'Enter team name',
        required: false
      }
    ],
    
    api: {
      render: `${API_BASE_URL}/api/closing/render`
    },
    
    defaults: {
      title: 'Thank you.',
      subtitle: 'If you have any questions:',
      email: '',
      teamName: ''
    },
    
    preview: {
      type: 'live',
      overlayComponent: 'ClosingOverlay'
    },
    
    // Feature flags
    features: {
      showPngPreview: false, // Hide PNG preview section - was for debugging only
      showVideoPreviewButton: true
    }
  },

  demo: {
    id: 'demo',
    name: 'Demo Video Creator',
    description: 'Upload a screen recording demo video (.mp4 or .mov)',
    
    // Section headers for new layout
    sectionHeaders: {
      files: 'Upload demo video:',
      text: null // Demo template has no text fields
    },
    
    // Tooltip information for section headers
    tooltips: {
      files: 'Upload your screen recording or demo video. Supported formats: .mp4, .mov. This will be used as-is without additional overlays.',
      text: null // No text section for demo template
    },
    
    files: [
      {
        id: 'video',
        label: 'Demo Video',
        description: 'Upload your screen recording demo video',
        type: 'video',
        accept: 'video/*,.mp4,.mov',
        required: true,
        uploadText: 'Click to upload demo video (.mp4 or .mov)'
      }
    ],
    
    textFields: [],
    
    api: {
      render: `${API_BASE_URL}/api/demo/render`
    },
    
    defaults: {},
    
    preview: {
      type: 'video',
      showOverlay: false
    },
    
    // Feature flags
    features: {
      showPngPreview: false,
      showVideoPreviewButton: false
    }
  },

  create: {
    id: 'create',
    name: 'Create Video',
    description: 'Create custom videos with flexible content options',
    
    files: [
      {
        id: 'media',
        label: 'Media Upload',
        description: 'Upload image, audio, or video file for your creation',
        type: 'media',
        accept: 'image/*,audio/*,video/*,.mp3,.wav,.aifc,.mov,.mp4,.jpg,.jpeg,.png,.gif',
        required: true,
        uploadText: 'Click to upload media file'
      }
    ],
    
    textFields: [
      {
        id: 'title',
        label: 'Title',
        placeholder: 'Enter your title',
        required: false
      },
      {
        id: 'subtitle',
        label: 'Subtitle',
        placeholder: 'Enter subtitle (optional)',
        required: false
      },
      {
        id: 'description',
        label: 'Description',
        placeholder: 'Enter description (optional)',
        required: false
      }
    ],
    
    api: {
      render: `${API_BASE_URL}/api/create/render`
    },
    
    defaults: {
      title: '',
      subtitle: '',
      description: ''
    },
    
    preview: {
      type: 'mixed',
      overlayComponent: 'CreateOverlay'
    },
    
    // Feature flags
    features: {
      showPngPreview: true,
      showVideoPreviewButton: true
    }
  }
};

/**
 * Gets configuration for a specific template
 * @param {string} templateId - The template identifier
 * @returns {Object|null} - Template configuration or null if not found
 */
export function getTemplateConfig(templateId) {
  return TEMPLATE_CONFIGS[templateId] || null;
}

/**
 * Gets all available template configurations
 * @returns {Object} - All template configurations
 */
export function getAllTemplateConfigs() {
  return TEMPLATE_CONFIGS;
}
