import { useState, useEffect, lazy, Suspense } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import VideoTemplateCreator from '@/components/shared/video-template-creator';
import { getTemplateConfig } from '@/lib/templateConfigs';
import OverlayPreviewSection from '@/components/shared/overlay-preview-section';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import SuccessModal from '@/components/shared/success-modal';
import { API_BASE_URL } from '@/lib/config';
import HeroLogo from '@/components/shared/HeroLogo';
import './Create.scss';
import './FreeFormTemplate.scss';

// Lazy load overlay components for thumbnails
const AnnouncementOverlay = lazy(() => import('@/components/announcement-overlay/AnnouncementOverlay'));
const HowItWorksOverlay = lazy(() => import('@/components/how-it-works-overlay/HowItWorksOverlay'));
const ClosingOverlay = lazy(() => import('@/components/closing-overlay/ClosingOverlay'));

// Drag Handle Icon
const DragHandleIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 2C7 0.89543 6.10457 0 5 0C3.89543 0 3 0.89543 3 2C3 3.10457 3.89543 4 5 4C6.10457 4 7 3.10457 7 2Z" />
    <path d="M7 10C7 8.89543 6.10457 8 5 8C3.89543 8 3 8.89543 3 10C3 11.1046 3.89543 12 5 12C6.10457 12 7 11.1046 7 10Z" />
    <path d="M5 16C6.10457 16 7 16.8954 7 18C7 19.1046 6.10457 20 5 20C3.89543 20 3 19.1046 3 18C3 16.8954 3.89543 16 5 16Z" />
    <path d="M15 0C16.1046 0 17 0.89543 17 2C17 3.10457 16.1046 4 15 4C13.8954 4 13 3.10457 13 2C13 0.89543 13.8954 0 15 0Z" />
    <path d="M17 10C17 8.89543 16.1046 8 15 8C13.8954 8 13 8.89543 13 10C13 11.1046 13.8954 12 15 12C16.1046 12 17 11.1046 17 10Z" />
    <path d="M15 16C16.1046 16 17 16.8954 17 18C17 19.1046 16.1046 20 15 20C13.8954 20 13 19.1046 13 18C13 16.8954 13.8954 16 15 16Z" />
  </svg>
);

// Lock Icon
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M17.3158 10.2904H16.7328L16.7337 7.13799C16.7337 4.31261 14.6031 2 12.0001 2C9.39704 2 7.26645 4.31261 7.26645 7.13799V10.2904H6.68342C5.75759 10.2904 5 11.1127 5 12.1176V20.1728C5 21.1777 5.75759 22 6.68342 22H17.3157C18.2415 22 18.9991 21.1777 18.9991 20.1728L19 12.1176C19 11.1127 18.2425 10.2904 17.3158 10.2904ZM9.36924 7.13799C9.36924 5.56762 10.5533 4.28236 12.0001 4.28236C13.4469 4.28236 14.631 5.56757 14.631 7.13799V10.2904H9.36924V7.13799ZM12.7091 16.0134V18.3758C12.7091 18.7987 12.3915 19.1454 12.0001 19.1454C11.6105 19.1454 11.2911 18.8006 11.2911 18.3758V16.0134C10.8673 15.7488 10.5839 15.2507 10.5839 14.6833C10.5839 13.8336 11.2173 13.1461 12.0001 13.1461C12.7829 13.1461 13.4163 13.8336 13.4163 14.6833C13.4163 15.2507 13.1311 15.7478 12.7091 16.0134Z"/>
  </svg>
);

// Sortable Template Card Component
function SortableTemplateCard({ template, isDraggable, onAddClick, onClearClick, isOver, moveDirection }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`template-card ${template.status === 'ready' ? 'ready' : ''} ${isDraggable ? 'draggable' : 'locked'} ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''} ${moveDirection === 'left' ? 'move-left' : ''} ${moveDirection === 'right' ? 'move-right' : ''}`}
      onClick={() => {
        // Only handle click for empty templates
        if (template.status !== 'ready' && !isDragging) {
          onAddClick(template.name);
        }
      }}
    >
      {/* Drop indicator line - shows where card will be placed */}
      {isOver && (
        <div className="drop-indicator" />
      )}

      {/* Drag handle - only show for draggable cards */}
      {isDraggable && (
        <div className="drag-handle" {...attributes} {...listeners}>
          <DragHandleIcon />
        </div>
      )}

      {/* Lock icon - only show for locked cards */}
      {!isDraggable && (
        <div className="lock-icon">
          <LockIcon />
        </div>
      )}

      <div className="template-content">
        {template.status === 'ready' && template.previewData ? (
          <div className="template-preview">
            {(() => {
              // For specific templates, show the preview component
              if (['announcement', 'how-it-works', 'closing'].includes(template.id)) {
                return (
                  <Suspense fallback={<div className="placeholder-thumbnail"><span>Loading...</span></div>}>
                    {renderPreviewThumbnail(template)}
                  </Suspense>
                );
              }

              // For other templates, find first available preview image
              const previewUrl = Object.values(template.previewData).find(fileData =>
                fileData?.preview
              )?.preview;

              return previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`${template.name} preview`}
                  className="preview-thumbnail"
                />
              ) : (
                <div className="placeholder-thumbnail">
                  <span>{template.name}</span>
                </div>
              );
            })()}
            <div className="thumbnail-hover-overlay">
              <button
                className="edit-button-overlay"
                onClick={() => onAddClick(template.name)}
              >
                <svg viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M75.895 11.02L70.0044 5.12937C65.6685 0.793472 58.1134 0.801272 53.8014 5.12937L47.9186 11.0122C47.9186 11.0122 47.9108 11.0161 47.9069 11.02C47.903 11.0239 47.903 11.0278 47.8991 11.0317L27.5471 31.3837C25.758 33.1728 24.3479 35.2548 23.3479 37.579L17.4143 51.419C15.9143 54.9346 16.6877 58.9424 19.3791 61.63C21.1682 63.423 23.5197 64.3644 25.926 64.3644C27.1604 64.3644 28.4104 64.1144 29.5979 63.6027L43.4459 57.6691C45.7701 56.6769 47.8561 55.2668 49.6412 53.4738L75.8952 27.2198C80.36 22.755 80.36 15.4818 75.8952 11.0168L75.895 11.02ZM45.223 49.059C43.9964 50.2856 42.5746 51.2465 40.9847 51.9262L27.1327 57.8598C25.996 58.352 24.6796 58.102 23.8007 57.2192C22.9218 56.3402 22.6718 55.0317 23.1601 53.8833L29.0937 40.0473C29.7773 38.4575 30.7421 37.0278 31.9648 35.8012L50.1128 17.6532L63.3708 30.9111L45.223 49.059ZM71.477 22.809L67.7934 26.4926L54.5354 13.2346L58.219 9.55097C60.1917 7.58617 63.6135 7.58617 65.5862 9.55097L71.4768 15.4416C73.5041 17.4689 73.5043 20.7777 71.477 22.809ZM70.1254 58.832V67.164C70.1254 73.4843 64.9887 78.621 58.6684 78.621L12.8324 78.6249C6.51213 78.6249 1.37543 73.4882 1.37543 67.1679V21.1949C1.37543 18.0972 2.59023 15.1988 4.79733 13.0269C7.00043 10.855 9.88713 9.76128 13.0278 9.73778L21.2231 9.87059C22.9497 9.89793 24.3247 11.3198 24.2934 13.0464C24.2661 14.7534 22.8715 16.1206 21.1684 16.1206H21.1137L12.9184 15.9878C11.5864 15.9682 10.184 16.4956 9.18014 17.48C8.18014 18.4683 7.62544 19.7847 7.62544 21.1909V67.1639C7.62544 70.035 9.96134 72.3709 12.8324 72.3709H58.6644C61.5355 72.3709 63.8714 70.035 63.8714 67.1639V58.8319C63.8714 57.1053 65.2698 55.7069 66.9964 55.7069C68.723 55.7069 70.1214 57.1053 70.1214 58.8319L70.1254 58.832Z"/>
                </svg>
              </button>
              <button
                className="delete-button-overlay"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearClick(template.id);
                }}
              >
                <svg viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M72.0492 16.7961H62.5297L60.6406 9.22569C59.4318 4.37985 55.1029 1 50.1199 1H30.8896C25.9064 1 21.5812 4.37985 20.3688 9.22569L18.4798 16.7961H8.95741C7.3234 16.7961 6 18.1214 6 19.7577C6 21.394 7.3234 22.7192 8.95741 22.7192H10.1477L13.3676 67.9156C13.7705 73.5684 18.5209 78 24.1846 78H56.8154C62.4789 78 67.2293 73.5688 67.6324 67.9156L70.8523 22.7192H72.0426C73.6766 22.7192 75 21.394 75 19.7577C75 18.1214 73.6766 16.7961 72.0426 16.7961H72.0492ZM26.1096 10.662C26.6604 8.45938 28.6271 6.92308 30.8932 6.92308H50.1234C52.3895 6.92308 54.3563 8.46308 54.9071 10.662L56.4375 16.7961H24.5752L26.1056 10.662H26.1096ZM61.7385 67.4942C61.5574 70.0633 59.3947 72.0771 56.8219 72.0771H24.1872C21.6106 72.0771 19.4517 70.0633 19.2706 67.4942L16.0766 22.7195H64.9291L61.7351 67.4942H61.7385ZM45.4326 55.2964V35.5541C45.4326 33.9178 46.756 32.5926 48.39 32.5926C50.024 32.5926 51.3474 33.9178 51.3474 35.5541V55.2964C51.3474 56.9327 50.024 58.258 48.39 58.258C46.756 58.258 45.4326 56.9327 45.4326 55.2964ZM29.6623 55.2964V35.5541C29.6623 33.9178 30.9857 32.5926 32.6197 32.5926C34.2537 32.5926 35.5771 33.9178 35.5771 35.5541V55.2964C35.5771 56.9327 34.2537 58.258 32.6197 58.258C30.9857 58.258 29.6623 56.9327 29.6623 55.2964Z"/>
                </svg>
              </button>
            </div>
            <div className="ready-indicator">
              <div className="checkmark">✓</div>
            </div>
          </div>
        ) : (
          <>
            <h3 className="template-name">
              {template.name}
            </h3>
            <button className="add-button">
              <svg viewBox="0 0 80 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M61.0236 32.3829H48.8516C47.7735 32.3829 46.8985 31.5079 46.8985 30.4298V18.2578C46.8985 14.2578 43.6446 11 39.6407 11C35.6407 11 32.3829 14.2539 32.3829 18.2578V30.4298C32.3829 31.5079 31.5079 32.3829 30.4298 32.3829H18.2578C14.2578 32.3829 11 35.6368 11 39.6407C11 43.6407 14.2539 46.8985 18.2578 46.8985H30.4298C31.5079 46.8985 32.3829 47.7735 32.3829 48.8516V61.0236C32.3829 65.0236 35.6368 68.2814 39.6407 68.2814C43.6407 68.2814 46.8985 65.0275 46.8985 61.0236V48.8516C46.8985 47.7735 47.7735 46.8985 48.8516 46.8985H61.0236C65.0236 46.8985 68.2814 43.6446 68.2814 39.6407C68.2814 35.6407 65.0275 32.3829 61.0236 32.3829Z" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to render preview thumbnail for templates
function renderPreviewThumbnail(template) {
  const config = getTemplateConfig(template.id);
  const { textData = {}, files = {} } = template.config || {};

  // Get overlay component and props based on template type
  const getOverlayComponent = () => {
    switch (template.id) {
      case 'announcement':
        return (
          <AnnouncementOverlay
            title={textData.title || config.defaults?.title || ''}
            description={textData.description || config.defaults?.description || ''}
            imagePreview={files.image?.preview || null}
          />
        );
      case 'how-it-works':
        return (
          <HowItWorksOverlay
            title={textData.title || config.defaults?.title || 'How It Works'}
            description={textData.description || config.defaults?.description || ''}
            stepNumber={null}
            subtitle={null}
            imagePreview={files.image?.preview || null}
            showImage={template.savedData?.showImage || false}
          />
        );
      case 'closing':
        return (
          <ClosingOverlay
            title={textData.title || config.defaults?.title || ''}
            subtitle={textData.subtitle || config.defaults?.subtitle || ''}
            email={textData.email || config.defaults?.email || ''}
            teamName={textData.teamName || config.defaults?.teamName || ''}
            directorName={textData.directorName || config.defaults?.directorName || ''}
          />
        );
      default:
        return null;
    }
  };

  const overlayComponent = getOverlayComponent();
  if (!overlayComponent) return null;

  // Get background image for announcement template
  const backgroundImage = template.id === 'announcement' ? files.image?.preview : null;
  const shouldSetBackground = !!backgroundImage;

  return (
    <div className="preview-thumbnail-container">
      <OverlayPreviewSection
        config={config}
        overlayComponent={overlayComponent}
        audioDuration={0}
        files={files}
        backgroundImage={backgroundImage}
        shouldSetBackground={shouldSetBackground}
        showRestartButton={false}
        showDecorativeElements={true}
        containerClassName="thumbnail-preview"
      />
    </div>
  );
}

// Intercepts the render action
function VideoTemplateModalWrapper({ templateId, onDone, onCancel, onDelete, initialData }) {
  const config = getTemplateConfig(templateId);

  // State to track template-specific data (like hideOverlay for persona)
  const [savedData, setSavedData] = useState(initialData || {});

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Handler to update saved data
  const handleDataChange = (newData) => {
    setSavedData(newData);
  };

  const modalConfig = {
    ...config,
    onRenderIntercept: (templateData) => {
      // Include savedData in the template data when done
      const completeData = {
        ...templateData,
        savedData
      };
      onDone(completeData);
    },
    onCancel: () => onCancel(hasUnsavedChanges),
    onDelete: onDelete,
    initialData: initialData,
    onUnsavedChanges: setHasUnsavedChanges
  };

  return (
    <div className="modal-template-wrapper">
      <VideoTemplateCreator
        config={modalConfig}
        savedData={savedData}
        onDataChange={handleDataChange}
      />
    </div>
  );
}

export default function FreeFormTemplate() {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState('');

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successVideoUrl, setSuccessVideoUrl] = useState(null);
  const [successVideoName, setSuccessVideoName] = useState('');

  // Timeline state - templates in default order (Introduction, Problem, Feature, Persona, Demo, Closing)
  const [templates, setTemplates] = useState([
    { id: 'intro', name: 'Introduction', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'how-it-works', name: 'Problem', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'announcement', name: 'Feature', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'persona', name: 'Who it\'s for', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'demo', name: 'Demo', status: 'empty', config: null, previewData: null, savedData: null },
    { id: 'closing', name: 'Closing', status: 'empty', config: null, previewData: null, savedData: null }
  ]);

  // Template name to ID mapping
  const templateNameToId = {
    'Introduction': 'intro',
    'Feature': 'announcement',
    'Problem': 'how-it-works',
    'Who it\'s for': 'persona',
    'Demo': 'demo',
    'Closing': 'closing'
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track which item is being hovered over during drag
  const [overId, setOverId] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    setOverId(over?.id || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setOverId(null); // Clear the over state
    setActiveId(null); // Clear the active state

    if (active.id !== over.id) {
      setTemplates((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Don't allow dragging before intro or after closing
        if (newIndex === 0 || newIndex === items.length - 1) {
          return items;
        }

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddClick = (templateName) => {
    const templateId = templateNameToId[templateName];
    const template = templates.find(t => t.id === templateId);

    // Special handling for Closing template: pre-fill teamName with Intro's team value
    let initialData = template?.savedData || null;
    if (templateId === 'closing') {
      // Find intro template and get its team value
      const introTemplate = templates.find(t => t.id === 'intro');
      const introTeamValue = introTemplate?.config?.textData?.team;

      if (introTeamValue) {
        // If there's no existing initialData, create it
        if (!initialData) {
          initialData = {
            textData: {
              teamName: introTeamValue
            }
          };
        } else if (!initialData.textData?.teamName) {
          // If initialData exists but teamName is empty, set it
          initialData = {
            ...initialData,
            textData: {
              ...initialData.textData,
              teamName: introTeamValue
            }
          };
        }
      }
    }

    setSelectedTemplate({
      name: templateName,
      id: templateId,
      savedData: initialData
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
    setShowConfirmDialog(false);
    setPendingClose(false);
  };

  const handleModalClose = (hasUnsavedChanges) => {
    if (hasUnsavedChanges) {
      // Show confirmation dialog
      setShowConfirmDialog(true);
      setPendingClose(true);
    } else {
      // No unsaved changes, close immediately
      closeModal();
    }
  };

  const handleConfirmDiscard = () => {
    // User chose to discard changes
    closeModal();
  };

  const handleCancelClose = () => {
    // User chose to stay in modal
    setShowConfirmDialog(false);
    setPendingClose(false);
  };

  const handleTemplateDelete = () => {
    if (!selectedTemplate) return;

    // Clear the template from timeline
    setTemplates(prev => prev.map(template =>
      template.id === selectedTemplate.id
        ? {
            ...template,
            status: 'empty',
            config: null,
            previewData: null,
            savedData: null
          }
        : template
    ));
    closeModal();
  };

  const handleTemplateClear = (templateId) => {
    // Clear the template from timeline directly (without modal)
    setTemplates(prev => prev.map(template =>
      template.id === templateId
        ? {
            ...template,
            status: 'empty',
            config: null,
            previewData: null,
            savedData: null
          }
        : template
    ));
  };

  const handleTemplateDone = async (templateData) => {
    if (!selectedTemplate) return;

    try {
      // Extract savedData from templateData (e.g., hideOverlay for persona)
      const { savedData, ...restTemplateData } = templateData;

      // Create stable preview data that won't be revoked
      const stablePreviewData = {};

      // Process files and create stable previews
      for (const [fileId, fileData] of Object.entries(restTemplateData.files)) {
        if (fileData.file) {
          if (fileData.file.type.startsWith('image/')) {
            // Create data URL for images
            const dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(fileData.file);
            });

            stablePreviewData[fileId] = {
              ...fileData,
              preview: dataUrl
            };
          } else {
            // For videos/audio, use thumbnail or create a placeholder
            stablePreviewData[fileId] = {
              ...fileData,
              preview: fileData.thumbnail || null
            };
          }
        }
      }

      // Update the template state
      setTemplates(prev => prev.map(template =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              status: 'ready',
              config: restTemplateData,
              previewData: stablePreviewData,
              savedData: restTemplateData // Save full template data (files + textData) for editing later
            }
          : template
      ));

    } catch (error) {
      console.error('Error processing template data:', error);
      // Still mark as ready but without preview
      const { savedData, ...restTemplateData } = templateData;
      setTemplates(prev => prev.map(template =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              status: 'ready',
              config: restTemplateData,
              previewData: {},
              savedData: restTemplateData // Save full template data for editing later
            }
          : template
      ));
    }

    // Close modal
    closeModal();
  };

  const handleRenderFinal = async () => {
    const readyTemplates = templates.filter(t => t.status === 'ready');

    if (readyTemplates.length === 0) {
      alert('Fill out at least 1 template to render a video');
      return;
    }

    setIsRendering(true);

    try {
      // Step 1: Render each template individually to get video data
      setRenderingProgress('Rendering individual template videos...');
      const renderedVideos = [];

      const templateOrderMap = {
        'intro': 1,
        'how-it-works': 2,
        'announcement': 3,
        'persona': 4,
        'demo': 5,
        'closing': 6
      };

      for (let i = 0; i < readyTemplates.length; i++) {
        const template = readyTemplates[i];
        setRenderingProgress(`Rendering ${template.name}...`);

        // Create FormData for this template
        const formData = new FormData();

        // Add files - apply trim if necessary
        for (const [fileId, fileData] of Object.entries(template.config.files)) {
          if (fileData.file) {
            let fileToUpload = fileData.file;

            // Apply trim if file is trimmed and it's a video/media file
            if (fileData.isTrimmed && fileData.duration > 0) {
              try {
                setRenderingProgress(`Trimming ${template.name}...`);

                // Call trim API
                const trimFormData = new FormData();
                trimFormData.append('video', fileData.file);
                trimFormData.append('start', fileData.trimStart.toString());
                trimFormData.append('end', fileData.trimEnd.toString());

                const trimResponse = await fetch(`${API_BASE_URL}/trim`, {
                  method: 'POST',
                  body: trimFormData
                });

                if (!trimResponse.ok) {
                  const errorText = await trimResponse.text();
                  throw new Error(`Trim failed: ${errorText}`);
                }

                // Get the trimmed file blob
                const trimmedBlob = await trimResponse.blob();
                fileToUpload = new File([trimmedBlob], fileData.file.name, { type: fileData.file.type });

                setRenderingProgress(`Rendering ${template.name}...`);
              } catch (trimError) {
                console.error(`Trim error for ${fileId}:`, trimError);
                throw new Error(`Failed to trim ${fileId}: ${trimError.message}`);
              }
            }

            formData.append(fileId, fileToUpload);

            // Use trimmed duration if trimmed
            const finalDuration = fileData.isTrimmed
              ? (fileData.trimEnd - fileData.trimStart)
              : fileData.duration;

            if (finalDuration > 0) {
              formData.append('duration', finalDuration.toString());
            }
          }
        }

        // Add text data
        Object.entries(template.config.textData).forEach(([key, value]) => {
          formData.append(key, value || '');
        });

        // Add mode parameter for templates that support it (like how-it-works)
        if (template.config.templateMode) {
          formData.append('mode', template.config.templateMode);
        }

        // Get template config and call the API
        const templateConfig = getTemplateConfig(template.id);
        const response = await fetch(templateConfig.api.render, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${template.name} render failed: ${errorText}`);
        }

        // Get video data as bytes
        const videoBlob = await response.blob();
        const videoBytes = await videoBlob.arrayBuffer();

        renderedVideos.push({
          order: templateOrderMap[template.id],
          videoData: videoBytes,
          templateName: template.name,
          templateId: template.id
        });
      }

      // Step 2: Get filename from announcement template title
      const announcementTemplate = readyTemplates.find(t => t.id === 'announcement');
      const finalFilename = announcementTemplate?.config?.textData?.title || 'presentation-final';

      setRenderingProgress(`Combining ${renderedVideos.length} videos into final presentation...`);

      // Step 3: Send videos to concatenation endpoint
      const concatenateFormData = new FormData();

      // Add videos to FormData using canonical template order slots (1-6)
      const videoSlotMap = {};
      renderedVideos.forEach(video => {
        videoSlotMap[video.order] = video;
      });
      for (let slot = 0; slot < 6; slot++) {
        const templateOrder = slot + 1;
        const video = videoSlotMap[templateOrder];
        if (video) {
          const videoBlob = new Blob([video.videoData], { type: 'video/mp4' });
          concatenateFormData.append(`segment_${slot}`, videoBlob, `segment_${slot}.mp4`);
          concatenateFormData.append(`order_${slot}`, video.order.toString());
          concatenateFormData.append(`template_id_${slot}`, video.templateId || '');
        }
      }

      concatenateFormData.append('final_filename', finalFilename);

      const concatenateResponse = await fetch(`${API_BASE_URL}/concatenate-multipart`, {
        method: 'POST',
        body: concatenateFormData,
      });

      if (!concatenateResponse.ok) {
        const errorText = await concatenateResponse.text();
        throw new Error(`Video concatenation failed: ${errorText}`);
      }

      // Step 4: Download the final concatenated video
      setRenderingProgress('Preparing download...');
      const finalVideoBlob = await concatenateResponse.blob();

      const url = URL.createObjectURL(finalVideoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${finalFilename}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setRenderingProgress(`Successfully created "${finalFilename}.mp4"!`);

      // Show success modal with video preview
      setTimeout(() => {
        setIsRendering(false);
        setRenderingProgress('');
        setSuccessVideoUrl(url);
        setSuccessVideoName(`${finalFilename}.mp4`);
        setShowSuccessModal(true);
      }, 1000);

    } catch (error) {
      console.error('Final render error:', error);
      setIsRendering(false);
      setRenderingProgress('');
      alert(`Error creating final presentation: ${error.message}`);
    }
  };

  // Check if any templates are ready for final render
  const hasAnyReady = templates.some(t => t.status === 'ready');

  // Get draggable template IDs (exclude intro and closing)
  const draggableTemplateIds = templates.slice(1, -1).map(t => t.id);

  return (
    <div className="video-builder free-form-builder">
      <div className="highlight-global"></div>
      <div className="video-builder-container">

        <div className="mobile-only">
          <p>Best experienced on <strong>desktop.</strong></p>
          <p>Mobile coming soon.</p> 
        </div>

        <div className="video-builder-section-title">
          <HeroLogo />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={`template-grid ${activeId ? 'dragging-active' : ''}`}>
            <SortableContext
              items={templates.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {templates.map((template, index) => {
                // First (intro) and last (closing) are not draggable
                const isDraggable = index !== 0 && index !== templates.length - 1;
                // Check if this card is being hovered over
                const isOver = overId === template.id;
                
                // Determine if this card should move left or right
                let moveDirection = null;
                if (overId && activeId) {
                  const overIndex = templates.findIndex(t => t.id === overId);
                  const activeIndex = templates.findIndex(t => t.id === activeId);
                  
                  // When dragging down (active is above over)
                  if (activeIndex < overIndex) {
                    // Card at the drop position should move right
                    if (index === overIndex && index !== templates.length - 1) {
                      moveDirection = 'right';
                    }
                    // Card before the drop position should move left
                    else if (index === overIndex - 1 && index !== 0) {
                      moveDirection = 'left';
                    }
                  }
                  // When dragging up (active is below over)
                  else if (activeIndex > overIndex) {
                    // Card at the drop position should move left
                    if (index === overIndex && index !== 0) {
                      moveDirection = 'left';
                    }
                    // Card after the drop position should move right
                    else if (index === overIndex + 1 && index !== templates.length - 1) {
                      moveDirection = 'right';
                    }
                  }
                }

                return (
                  <SortableTemplateCard
                    key={template.id}
                    template={template}
                    isDraggable={isDraggable}
                    isOver={isOver}
                    moveDirection={moveDirection}
                    onAddClick={handleAddClick}
                    onClearClick={handleTemplateClear}
                  />
                );
              })}
            </SortableContext>
          </div>
        </DndContext>

        {/* Final Render Button */}
        {hasAnyReady && (
          <div className="final-render-section">
            <button
              className={`final-render-button ${isRendering ? 'loading' : ''}`}
              onClick={handleRenderFinal}
              disabled={!hasAnyReady || isRendering}
            >
              {isRendering ? (
                <div className="loading-content">
                  <div className="spinner"></div>
                  <span>{renderingProgress}</span>
                </div>
              ) : hasAnyReady ? (
                'Create Video'
              ) : (
                'Configure at least 1 template'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedTemplate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{selectedTemplate.name} Template</h2>
              <button className="modal-close" onClick={() => handleModalClose(true)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <VideoTemplateModalWrapper
                templateId={selectedTemplate.id}
                onDone={handleTemplateDone}
                onCancel={handleModalClose}
                onDelete={handleTemplateDelete}
                initialData={selectedTemplate.savedData}
              />
            </div>
          </div>

          {/* Confirmation Dialog */}
          <ConfirmationDialog
            isVisible={showConfirmDialog}
            title="Unsaved Changes"
            message="What would you like to do?"
            cancelText="Cancel"
            discardText="Discard"
            onCancel={handleCancelClose}
            onDiscard={handleConfirmDiscard}
          />
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isVisible={showSuccessModal}
        videoName={successVideoName}
        videoUrl={successVideoUrl}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessVideoUrl(null);
          setSuccessVideoName('');
        }}
      />
    </div>
  );
}

