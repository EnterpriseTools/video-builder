import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Button from '@/components/shared/button';
import IconButton from '@/components/shared/icon-button';
import { Input } from '@/components/shared/input';
import { API_BASE_URL } from '@/lib/config';
import './AIImageGenerator.scss';

// Icon Components
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M7.0318 11.4191C7.04678 11.6715 7.16275 11.9099 7.36341 12.0898L11.1921 15.5233C11.6364 15.9218 12.3641 15.9218 12.8084 15.5233L16.6372 12.0898C17.344 11.4553 16.86 10.3423 15.8287 10.3423C15.5251 10.3423 15.2352 10.4469 15.0202 10.6397L13.1433 12.3235V6.02614C13.1433 5.75389 13.0214 5.49566 12.8156 5.31105C12.0299 4.62634 10.8573 5.165 10.8573 6.02614V12.3241L8.97968 10.6403C8.31062 10.0397 7.0318 10.3687 7.0318 11.4191ZM6.37316 17.2199C5.56207 17.9473 6.18944 19 7.14451 19H16.8566C17.8821 19 18.372 17.8689 17.6723 17.2595C17.4456 17.0621 17.1765 16.9499 16.8566 16.9499L7.14451 16.9493C6.8572 16.9493 6.58359 17.0464 6.37316 17.2199Z" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.2246 5.00001C11.6527 5.00027 11.9997 5.34728 12 5.7754C12 6.20374 11.6529 6.55152 11.2246 6.55177H6.84473C6.50196 6.55183 6.1731 6.68837 5.93066 6.93068C5.68821 7.17313 5.55182 7.50186 5.55176 7.84474V17.1553C5.55176 17.4982 5.68816 17.8278 5.93066 18.0703C6.17308 18.3125 6.50205 18.4492 6.84473 18.4492H16.1553C16.4981 18.4491 16.8279 18.3127 17.0703 18.0703C17.3127 17.8278 17.4492 17.4981 17.4492 17.1553V14.2354C17.4492 14.2318 17.4482 14.2282 17.4482 14.2246V12.7754C17.4485 12.3471 17.7963 12 18.2246 12C18.6527 12.0003 18.9997 12.3473 19 12.7754V13.0176H19.001V17.1553C19.001 17.9097 18.7004 18.6335 18.167 19.167C17.6336 19.7004 16.9096 20.0009 16.1553 20.001H6.84473C6.09039 20.0009 5.36646 19.7003 4.83301 19.167C4.29966 18.6335 4 17.9097 4 17.1553V7.84474C4.00006 7.0903 4.29954 6.36649 4.83301 5.83302C5.36646 5.2997 6.0904 5.00007 6.84473 5.00001H11.2246ZM17.2529 4.00001C17.796 4.00014 18.3277 4.16129 18.7793 4.4629C19.2308 4.76464 19.583 5.19371 19.791 5.69532C19.999 6.19702 20.0538 6.74953 19.9482 7.28224C19.8425 7.81505 19.5801 8.30509 19.1963 8.68947L14.2129 13.668C13.7924 14.0912 13.2922 14.4276 12.7412 14.6563C12.1902 14.8848 11.5985 15.0013 11.002 15H9V12.999C8.9983 12.4018 9.11511 11.8095 9.34375 11.2578C9.57236 10.7064 9.9086 10.2059 10.332 9.78517L15.3105 4.80372C15.565 4.54821 15.868 4.34492 16.2012 4.20704C16.5343 4.06925 16.8924 3.99894 17.2529 4.00001ZM17.2461 5.46486C16.9054 5.45939 16.5758 5.58737 16.3271 5.82032L11.3457 10.8008C11.0562 11.0887 10.8263 11.4315 10.6699 11.8086C10.5135 12.1858 10.4337 12.5907 10.4346 12.999V13.5654H11.002C11.4104 13.5665 11.816 13.4864 12.1934 13.3301C12.5706 13.1737 12.9132 12.9438 13.2012 12.6543L18.1807 7.67286L18.1826 7.67579C18.4155 7.42724 18.5435 7.09743 18.5381 6.75685C18.5326 6.4162 18.3941 6.09061 18.1533 5.84962C17.9124 5.60871 17.5867 5.47047 17.2461 5.46486Z"/>
  </svg>
);

const RegenerateIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.8232 7.58594C18.1211 7.41531 18.5075 7.50466 18.6875 7.79004C19.4741 9.03655 19.8888 10.4722 19.8896 11.9385C19.8896 16.3723 16.1349 19.9805 11.5195 19.9805C10.7739 19.9804 10.0444 19.8778 9.33887 19.6943L9.57812 20.0947C9.75177 20.3831 9.64753 20.7538 9.34668 20.9199C9.24766 20.9743 9.1393 21 9.0332 21C8.8149 20.9999 8.6036 20.8909 8.4873 20.6963L7.40137 18.8789C7.31504 18.7332 7.29465 18.5602 7.3457 18.3994C7.39764 18.2396 7.5159 18.1074 7.67285 18.0342L9.6377 17.127C9.95048 16.982 10.3282 17.1087 10.4775 17.4092C10.6283 17.7096 10.4961 18.0715 10.1836 18.2158L9.55957 18.5039C10.1921 18.6783 10.8477 18.7725 11.5195 18.7725C15.441 18.7723 18.6318 15.7071 18.6318 11.9395C18.6318 10.6927 18.2793 9.47462 17.6113 8.41602C17.4323 8.13063 17.5263 7.75882 17.8232 7.58594ZM14.4336 3.08008C14.7352 2.91442 15.1189 3.01405 15.291 3.30273L16.3779 5.11914C16.4651 5.26474 16.4843 5.43868 16.4326 5.59863C16.3807 5.75869 16.2617 5.89161 16.1045 5.96484L14.1396 6.87207C14.0518 6.91271 13.96 6.93163 13.8682 6.93164C13.6333 6.93164 13.4093 6.80559 13.3008 6.58984C13.1499 6.28936 13.2819 5.92741 13.5947 5.7832L14.2188 5.49512C13.587 5.32075 12.9306 5.22561 12.2588 5.22559C8.33767 5.22559 5.14668 8.29144 5.14746 12.0596C5.14748 13.3062 5.49995 14.5236 6.16797 15.582C6.34715 15.8674 6.25216 16.2392 5.95508 16.4121C5.85296 16.4709 5.74142 16.5 5.62988 16.5C5.41774 16.5 5.20969 16.3961 5.0918 16.209C4.30513 14.9626 3.88872 13.5274 3.88867 12.0605C3.88867 7.62731 7.64335 4.01977 12.2588 4.01953C13.0047 4.01953 13.7347 4.12123 14.4404 4.30469L14.2012 3.90527C14.0275 3.61687 14.1326 3.24618 14.4336 3.08008ZM11.8887 8.62402C12.1429 8.62402 12.3716 8.78271 12.458 9.0166L12.46 9.01855L12.7266 9.74902C12.9696 10.4145 13.4978 10.9339 14.1738 11.1738L14.916 11.4365C15.1561 11.5236 15.3177 11.7488 15.3184 11.999C15.3184 12.2488 15.1564 12.4749 14.918 12.5605L14.1748 12.8242C13.4989 13.0635 12.9712 13.5836 12.7275 14.249L12.4609 14.9785C12.3727 15.2157 12.1432 15.3739 11.8896 15.374C11.636 15.374 11.4063 15.2152 11.3193 14.9805L11.0508 14.249C10.8077 13.5838 10.2803 13.0641 9.60449 12.8242L8.8623 12.5615C8.62137 12.4745 8.46094 12.2487 8.46094 11.999C8.46095 11.7495 8.62124 11.5236 8.85938 11.4385L9.60254 11.1748C10.2786 10.9355 10.8071 10.4155 11.0508 9.75L11.3174 9.01953C11.4058 8.78253 11.6345 8.62403 11.8887 8.62402ZM11.8887 10.4756C11.5533 11.1363 11.0114 11.6689 10.3408 11.999C11.012 12.3291 11.5533 12.8624 11.8887 13.5225C12.2247 12.8617 12.766 12.3291 13.4365 11.999C12.7653 11.6689 12.224 11.1357 11.8887 10.4756Z"/>
  </svg>
);

const StartOverIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M7.0037 8C8.16925 6.54602 9.95635 5.61175 11.9621 5.60011C11.9896 5.59995 12.017 5.59997 12.0445 5.60015C13.7519 5.61179 15.3005 6.29199 16.4414 7.39203C16.5076 7.45583 16.5724 7.52108 16.6359 7.58775C17.7088 8.71466 18.375 10.2323 18.3992 11.9053C18.4003 11.9715 18.4002 12.0378 18.3992 12.1041C18.3727 13.7633 17.7148 15.269 16.6555 16.3917C16.5708 16.4814 16.4836 16.5687 16.3937 16.6535C15.2693 17.7156 13.7601 18.3746 12.0971 18.3993C12.0357 18.4003 11.9742 18.4003 11.9127 18.3995C8.68784 18.3563 6.03878 15.9281 5.64932 12.7984C5.59475 12.36 5.24183 12 4.8 12C4.35818 12 3.99585 12.359 4.03995 12.7986C4.06701 13.0684 4.10769 13.3358 4.16162 13.6C4.4452 14.9892 5.09515 16.2882 6.05722 17.3557C7.38153 18.8252 9.20331 19.7519 11.1709 19.9569C13.1384 20.1619 15.1121 19.6307 16.7108 18.4659C18.3097 17.301 19.4203 15.585 19.8281 13.6494C20.236 11.7137 19.9121 9.69557 18.9192 7.98462C17.9264 6.27367 16.3348 4.99126 14.4518 4.38499C12.5689 3.77871 10.528 3.89159 8.72337 4.7018C7.47854 5.26069 6.40698 6.12405 5.6 7.19998V5.6C5.6 5.15818 5.24182 4.8 4.8 4.8C4.35818 4.8 4 5.15818 4 5.6V8.8V9.60001H4.8H7.99999C8.44181 9.60001 8.79999 9.24183 8.79999 8.8C8.79999 8.35818 8.44181 8 7.99999 8H7.0037Z"/>
  </svg>
);

const AIImageGenerator = forwardRef(({ onImageGenerated, onGeneratingChange, onConversationChange }, ref) => {
  const [description, setDescription] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [lastGeneratedDescription, setLastGeneratedDescription] = useState('');
  
  // Ref for auto-scrolling conversation
  const conversationRef = useRef(null);

  // Auto-scroll to bottom of conversation container when messages change
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages, isChatting]);

  // Notify parent when generating state changes
  useEffect(() => {
    if (onGeneratingChange) {
      onGeneratingChange(isGenerating);
    }
  }, [isGenerating, onGeneratingChange]);

  // Notify parent when conversation state changes
  useEffect(() => {
    if (onConversationChange) {
      onConversationChange(messages.length > 0);
    }
  }, [messages.length, onConversationChange]);

  // Start conversation or add message
  const handleSendMessage = async () => {
    if (!description.trim()) return;

    setError(null);
    setIsChatting(true);
    setShowConversation(true);

    // Add user message to conversation
    const newMessages = [
      ...messages,
      { role: 'user', content: description }
    ];
    setMessages(newMessages);
    setDescription('');

    try {
      const response = await fetch(`${API_BASE_URL}/persona/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      // Add assistant response
      setMessages([
        ...newMessages,
        { role: 'assistant', content: data.response }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsChatting(false);
    }
  };

  // Generate the image
  const handleGenerateImage = async () => {
    setError(null);
    setIsGenerating(true);

    // If user has typed something, add it to the conversation first
    let updatedMessages = messages;
    if (description.trim()) {
      updatedMessages = [
        ...messages,
        { role: 'user', content: description }
      ];
      setMessages(updatedMessages);
      setDescription(''); // Clear input
    }

    // Compile all user messages into a single description
    const fullDescription = updatedMessages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    // Store this description for regeneration
    setLastGeneratedDescription(fullDescription);

    try {
      const response = await fetch(`${API_BASE_URL}/persona/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: fullDescription })
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setGeneratedImageUrl(data.image_url);
      
      // Don't automatically apply - wait for user to click "Apply"
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download the generated image
  const handleDownload = async () => {
    if (!generatedImageUrl) return;

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `persona-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download image');
    }
  };

  // Regenerate with the same description
  const handleRegenerate = async () => {
    if (!lastGeneratedDescription) return;
    
    setError(null);
    setIsGenerating(true);
    setGeneratedImageUrl(null);

    try {
      const response = await fetch(`${API_BASE_URL}/persona/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: lastGeneratedDescription })
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setGeneratedImageUrl(data.image_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Go back to edit the description
  const handleEdit = () => {
    setGeneratedImageUrl(null);
  };

  // Apply the generated image to preview
  const handleApply = () => {
    if (generatedImageUrl && onImageGenerated) {
      onImageGenerated(generatedImageUrl);
    }
  };

  // Start over
  const handleStartOver = () => {
    setMessages([]);
    setDescription('');
    setGeneratedImageUrl(null);
    setShowConversation(false);
    setError(null);
    setLastGeneratedDescription('');
  };

  // Expose handleStartOver to parent via ref
  useImperativeHandle(ref, () => ({
    handleStartOver
  }));

  return (
    <div className="ai-image-generator">
      {!generatedImageUrl ? (
        <>
          {/* Conversation Display - Shows above input */}
          {showConversation && messages.length > 0 && !isGenerating && (
            <div className="conversation-display" ref={conversationRef}>
              <div className="conversation-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message message--${msg.role}`}>
                    <div className="message-role">
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="message-content">
                      {msg.role === 'assistant' ? (
                        // Format numbered lists for AI responses
                        msg.content.split(/(?=\d+\.\s)/).map((line, i) => {
                          const trimmedLine = line.trim();
                          if (trimmedLine) {
                            return <div key={i} className="message-line">{trimmedLine}</div>;
                          }
                          return null;
                        })
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="message message--assistant">
                    <div className="message-role">AI Assistant</div>
                    <div className="message-content typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State - Show while generating */}
          {isGenerating ? (
            <div className="generation-loading">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
              </div>
              <p className="loading-text">Generating your persona image...</p>
            </div>
          ) : !isChatting && (
            <div className="ai-action-bar">
              {/* Input Section */}
              {messages.length === 0 ? (
                // Initial input: user enters subject and clicks "Start"
                <div className="generator-input-section">
                  <div className="ai-form">
                    <Input
                      value={description}
                      className="chat-input"
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the user you want to create..."
                      disabled={isChatting || isGenerating}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!description.trim() || isChatting || isGenerating}
                      variant="secondary"
                      className="add-button"
                    >
                      Start
                    </Button>
                  </div>
                </div>
              ) : (
                // After AI asks questions: show textarea + Generate Image button only
                <>
                  <div className="generator-input-section">
                    <textarea
                      value={description}
                      className="chat-textarea"
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add your details..."
                      disabled={isChatting || isGenerating}
                      rows={3}
                    />
                  </div>
                  <div className="generator-actions">
                    <Button
                      onClick={handleGenerateImage}
                      disabled={isGenerating || isChatting}
                      loading={isGenerating}
                      variant="primary"
                      className="generate-button"
                    >
                      {isGenerating ? 'Generating Image...' : 'Generate Image'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
        
      ) : (
        <>
          {/* Generated Image Display */}
          <div className="generated-image-display">
            <img src={generatedImageUrl} alt="Generated persona" className="generated-image" />
          </div>

          {/* Image Actions */}
          <div className="image-actions">
            <div className="left-actions">
              <IconButton
                icon={<EditIcon />}
                tooltip="Edit"
                onClick={handleEdit}
                variant="secondary"
              />
              <IconButton
                icon={<RegenerateIcon />}
                tooltip="Regenerate"
                onClick={handleRegenerate}
                variant="secondary"
                disabled={isGenerating}
                loading={isGenerating}
              />
              <IconButton
                icon={<DownloadIcon />}
                tooltip="Download"
                onClick={handleDownload}
                variant="secondary"
              />
            </div>
            <Button onClick={handleApply} variant="primary">
              Add Image
            </Button>
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="generator-error">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
});

AIImageGenerator.displayName = 'AIImageGenerator';

export default AIImageGenerator;

