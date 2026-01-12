import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getModel, deleteImage, getUserProfile } from '../services/supabaseService';
import { checkCreditsForGeneration } from '../services/imageGenerationService';
import { getPlanDetails } from '../services/pricingService';
import { generateModelImagesFromChat } from '../services/api';
import { generateNSFWImage, prepareImageForWavespeed } from '../services/wavespeedService';
import './ModelView.css';

function ModelView() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [editingImage, setEditingImage] = useState(null);
  const [imageFilters, setImageFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    noise: 0
  });
  const [selectionImages, setSelectionImages] = useState(null);
  const [selectionPrompt, setSelectionPrompt] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [credits, setCredits] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState('base');
  const [creditCost, setCreditCost] = useState(null);
  const [nsfwEnabled, setNsfwEnabled] = useState(false);
  const [nsfwChatInput, setNsfwChatInput] = useState('');
  const [nsfwChatMessages, setNsfwChatMessages] = useState([]);
  const [nsfwSelectedImage, setNsfwSelectedImage] = useState(null);
  const [isNsfwGenerating, setIsNsfwGenerating] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const chatMessagesRef = useRef(null);
  const nsfwChatMessagesRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadModel();
  }, [modelId]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const loadModel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const modelData = await getModel(modelId);
      setModel(modelData);
      
      // Load user profile with credits and subscription
      try {
        const profile = await getUserProfile();
        setCredits(profile.credits);
        setSubscriptionPlan(profile.subscription_plan || null); // null for no plan
      } catch (error) {
        console.error('Error loading profile:', error);
        setCredits(0); // Default fallback - zero credits
        setSubscriptionPlan(null); // No plan
      }
      
      setLoading(false);

      // Add welcome message
      setChatMessages([
        {
          type: 'system',
          content: `Hi! I'm ready to generate more images of ${modelData.name}. Just describe what you'd like to see - for example: "Generate images in a coffee shop", "Show her smiling outdoors", or "Create professional headshot style images".`
        }
      ]);

      // Initialize NSFW chat messages
      setNsfwChatMessages([
        {
          type: 'system',
          content: `NSFW Chat enabled. Select an image from the gallery or upload one, then describe the changes you'd like to make.`
        }
      ]);
    } catch (error) {
      console.error('Error loading model:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isGenerating) return;

    const userMessage = chatInput.trim();
    
    // Check credits before generation
    try {
      const creditCheck = await checkCreditsForGeneration(false, { batch: true });
      if (!creditCheck.hasCredits) {
        setChatMessages(prev => [...prev, {
          type: 'user',
          content: userMessage
        }, {
          type: 'error',
          content: creditCheck.error || 'Insufficient credits. Please recharge your credits to continue.'
        }]);
        return;
      }
      setCreditCost(creditCheck.cost);
    } catch (error) {
      console.error('Error checking credits:', error);
      setChatMessages(prev => [...prev, {
        type: 'user',
        content: userMessage
      }, {
        type: 'error',
        content: 'Error checking credits. Please try again.'
      }]);
      return;
    }

    setChatInput('');

    // Add user message to chat
    setChatMessages(prev => [...prev, {
      type: 'user',
      content: userMessage
    }]);

    // Add generating message with progress
    const generatingMessageIndex = chatMessages.length + 1;
    setChatMessages(prev => [...prev, {
      type: 'generating',
      content: `Generating images based on your request... (Cost: ${creditCost || 25} credits)`
    }]);

    setIsGenerating(true);
    setGenerationProgress(0);
    setTimeRemaining(60);

    // Start progress animation (60 seconds = 1 minute)
    const totalTime = 60; // 1 minute in seconds
    const updateInterval = 100; // Update every 100ms for smooth animation
    const progressStep = (updateInterval / (totalTime * 1000)) * 100; // Percentage per update
    let currentProgress = 0;
    let currentTimeRemaining = totalTime;

    progressIntervalRef.current = setInterval(() => {
      currentProgress += progressStep;
      currentTimeRemaining -= (updateInterval / 1000);

      if (currentProgress >= 95) {
        currentProgress = 95; // Cap at 95% until actually done
      }
      if (currentTimeRemaining <= 0) {
        currentTimeRemaining = 0;
      }

      setGenerationProgress(currentProgress);
      setTimeRemaining(Math.ceil(currentTimeRemaining));
    }, updateInterval);

    try {
      // Generate images using the new chat-based endpoint
      const response = await generateModelImagesFromChat(modelId, userMessage, 3);

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Complete progress to 100%
      setGenerationProgress(100);
      setTimeRemaining(0);

      if (response.success && response.images) {
        // Update credits after successful generation
        try {
          const profile = await getUserProfile();
          setCredits(profile.credits);
        } catch (error) {
          console.error('Error updating credits:', error);
        }

        // Small delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 300));

        // Remove generating message
        setChatMessages(prev => {
          return prev.filter((_, idx) => idx !== generatingMessageIndex);
        });

        // Show selection modal instead of adding images directly
        setSelectionImages(response.images);
        setSelectionPrompt(userMessage);
        setSelectedImageIndex(null);
      } else {
        throw new Error('Failed to generate images');
      }
    } catch (error) {
      console.error('Error generating images:', error);

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Reset progress
      setGenerationProgress(0);
      setTimeRemaining(60);

      // Remove generating message and show error
      let errorMessage = `Sorry, there was an error: ${error.message}. Please try again.`;
      
      // Handle insufficient credits error
      if (error.message && error.message.includes('Insufficient credits') || 
          error.response?.status === 402 || 
          error.response?.data?.code === 'INSUFFICIENT_CREDITS') {
        errorMessage = error.response?.data?.error || error.message || 'Insufficient credits. Please recharge your credits to continue generating images.';
      }

      setChatMessages(prev => {
        const filtered = prev.filter((_, idx) => idx !== generatingMessageIndex);
        return [...filtered, {
          type: 'error',
          content: errorMessage
        }];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNsfwImageSelect = (image) => {
    setNsfwSelectedImage(image);
    setNsfwChatMessages(prev => [...prev, {
      type: 'system',
      content: `Selected image: ${image.image_url ? 'Gallery image' : 'Uploaded image'}. Now describe what you'd like to change.`
    }]);
  };

  const handleNsfwImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setNsfwSelectedImage({
      url: imageUrl,
      file: file,
      isUpload: true
    });

    setNsfwChatMessages(prev => [...prev, {
      type: 'system',
      content: "Image uploaded. Now describe what you'd like to change."
    }]);
  };

  const handleNsfwSendMessage = async () => {
    if (!nsfwChatInput.trim() || isNsfwGenerating || !nsfwSelectedImage) {
      if (!nsfwSelectedImage) {
        alert('Please select or upload an image first');
      }
      return;
    }

    const userMessage = nsfwChatInput.trim();
    setNsfwChatInput('');

    // Add user message
    setNsfwChatMessages(prev => [...prev, {
      type: 'user',
      content: userMessage
    }]);

    // Add generating message
    setNsfwChatMessages(prev => [...prev, {
      type: 'generating',
      content: 'Generating NSFW image...'
    }]);

    setIsNsfwGenerating(true);

    try {
      // Prepare image URL
      let imageUrl;
      if (nsfwSelectedImage.isUpload && nsfwSelectedImage.file) {
        // For uploaded files, convert to data URL
        // Note: Wavespeed API may need a public URL, so in production you'd upload to CDN first
        imageUrl = await prepareImageForWavespeed(nsfwSelectedImage.file);
        
        // If it's a data URL and API doesn't accept it, we might need to upload to a temporary CDN
        // For now, try with data URL
      } else if (nsfwSelectedImage.image_url) {
        imageUrl = nsfwSelectedImage.image_url;
      } else if (nsfwSelectedImage.url) {
        imageUrl = nsfwSelectedImage.url;
      } else {
        throw new Error('Invalid image selected');
      }
      
      // Ensure we have a valid URL (not a blob URL for uploaded files)
      // If it's a blob URL, we need to convert it or the API won't accept it
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        // For data URLs, we can try using them directly
        // But if API doesn't accept data URLs, we'd need to upload to CDN first
        console.log('Using data/blob URL - API may need public URL');
      }

      // Generate NSFW image using Wavespeed
      const generatedImageUrl = await generateNSFWImage(imageUrl, userMessage);

      // Remove generating message and add result
      setNsfwChatMessages(prev => {
        const filtered = prev.filter(msg => msg.type !== 'generating');
        return [...filtered, {
          type: 'images',
          content: 'Generated image:',
          images: [generatedImageUrl]
        }];
      });

      // Update selected image to the new generated one
      setNsfwSelectedImage({
        url: generatedImageUrl,
        isUpload: false
      });
    } catch (error) {
      console.error('Error generating NSFW image:', error);
      setNsfwChatMessages(prev => {
        const filtered = prev.filter(msg => msg.type !== 'generating');
        return [...filtered, {
          type: 'error',
          content: `Error: ${error.message || 'Failed to generate image'}`
        }];
      });
    } finally {
      setIsNsfwGenerating(false);
    }
  };

  const handleImageSelect = (imageId, e) => {
    // Don't select if clicking on action buttons
    if (e && (e.target.closest('.image-actions') || e.target.closest('.image-action-btn'))) {
      return;
    }
    
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const handleDeleteImage = async (imageId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await deleteImage(imageId);
      // Reload model to update the gallery
      await loadModel();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const handleEditImage = (img, e) => {
    e.stopPropagation();
    setEditingImage(img);
    // Reset filters
    setImageFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      noise: 0
    });
  };

  useEffect(() => {
    const applyImageFilters = () => {
      if (!editingImage || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Limit canvas size for performance
        const maxWidth = 800;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Apply CSS filters first
        ctx.filter = `
          brightness(${imageFilters.brightness}%)
          contrast(${imageFilters.contrast}%)
          saturate(${imageFilters.saturation}%)
          hue-rotate(${imageFilters.hue}deg)
        `;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Apply noise if needed
        if (imageFilters.noise > 0) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const noiseAmount = imageFilters.noise;
          
          for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * noiseAmount * 2;
            data[i] = Math.max(0, Math.min(255, data[i] + noise)); // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
            // Alpha channel stays the same
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
      };
      
      img.src = editingImage.image_url;
    };

    if (editingImage) {
      applyImageFilters();
    }
  }, [editingImage, imageFilters]);

  const handleDownloadEditedImage = () => {
    if (!canvasRef.current) return;
    
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'edited-image.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleCloseEditModal = () => {
    setEditingImage(null);
  };

  const handleKeepImage = async () => {
    if (selectedImageIndex === null || !selectionImages || isSavingImage) return;

    setIsSavingImage(true);

    try {
      // Save only the selected image to Supabase
      const selectedImageUrl = selectionImages[selectedImageIndex];
      
      // Check if this image already exists to prevent duplicates
      const { data: existingImages, error: checkError } = await supabase
        .from('generated_images')
        .select('id')
        .eq('model_id', modelId)
        .eq('image_url', selectedImageUrl)
        .limit(1);

      if (checkError) {
        console.error('Error checking for duplicates:', checkError);
      }

      // If image already exists, just close modal without saving again
      if (existingImages && existingImages.length > 0) {
        console.log('Image already exists, skipping duplicate save');
        setSelectionImages(null);
        setSelectionPrompt('');
        setSelectedImageIndex(null);
        setIsSavingImage(false);
        await loadModel();
        setChatMessages(prev => [...prev, {
          type: 'system',
          content: 'Image already in gallery!'
        }]);
        return;
      }

      // Insert the new image
      const { data: newImage, error } = await supabase
        .from('generated_images')
        .insert([{
          model_id: modelId,
          image_url: selectedImageUrl,
          prompt: selectionPrompt,
          is_selected: false
        }])
        .select()
        .single();

      if (error) throw error;

      // Close selection modal first
      setSelectionImages(null);
      setSelectionPrompt('');
      setSelectedImageIndex(null);
      
      // Update model state immediately with the new image
      if (newImage && model) {
        setModel({
          ...model,
          generated_images: [newImage, ...(model.generated_images || [])]
        });
      }
      
      // Then reload model to ensure we have the latest data
      await loadModel();

      // Refresh credits after saving image
      try {
        const profile = await getUserProfile();
        setCredits(profile.credits);
        setSubscriptionPlan(profile.subscription_plan || 'base');
      } catch (error) {
        console.error('Error refreshing credits:', error);
      }

      // Add confirmation message to chat
      setChatMessages(prev => [...prev, {
        type: 'system',
        content: 'Image saved to your gallery!'
      }]);
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image. Please try again.');
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleRegenerateImages = async () => {
    if (!selectionPrompt.trim()) return;

    // Clear selection state
    setSelectionImages(null);
    setSelectedImageIndex(null);

    // Regenerate with same prompt
    const userMessage = selectionPrompt;
    setSelectionPrompt('');

    // Add generating message
    const generatingMessageIndex = chatMessages.length;
    setChatMessages(prev => [...prev, {
      type: 'generating',
      content: 'Regenerating images...'
    }]);

    setIsGenerating(true);
    setGenerationProgress(0);
    setTimeRemaining(60);

    // Start progress animation
    const totalTime = 60;
    const updateInterval = 100;
    const progressStep = (updateInterval / (totalTime * 1000)) * 100;
    let currentProgress = 0;
    let currentTimeRemaining = totalTime;

    progressIntervalRef.current = setInterval(() => {
      currentProgress += progressStep;
      currentTimeRemaining -= (updateInterval / 1000);

      if (currentProgress >= 95) {
        currentProgress = 95;
      }
      if (currentTimeRemaining <= 0) {
        currentTimeRemaining = 0;
      }

      setGenerationProgress(currentProgress);
      setTimeRemaining(Math.ceil(currentTimeRemaining));
    }, updateInterval);

    try {
      const response = await generateModelImagesFromChat(modelId, userMessage, 3);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      setGenerationProgress(100);
      setTimeRemaining(0);

      if (response.success && response.images) {
        await new Promise(resolve => setTimeout(resolve, 300));

        setChatMessages(prev => {
          return prev.filter((_, idx) => idx !== generatingMessageIndex);
        });

        setSelectionImages(response.images);
        setSelectionPrompt(userMessage);
        setSelectedImageIndex(null);
      } else {
        throw new Error('Failed to generate images');
      }
    } catch (error) {
      console.error('Error regenerating images:', error);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      setGenerationProgress(0);
      setTimeRemaining(60);

      setChatMessages(prev => {
        const filtered = prev.filter((_, idx) => idx !== generatingMessageIndex);
        return [...filtered, {
          type: 'error',
          content: `Sorry, there was an error: ${error.message}. Please try again.`
        }];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseSelectionModal = () => {
    // Don't save any images, just close
    setSelectionImages(null);
    setSelectionPrompt('');
    setSelectedImageIndex(null);
    
    setChatMessages(prev => [...prev, {
      type: 'system',
      content: 'Image generation cancelled. No images were saved.'
    }]);
  };

  if (loading) {
    return (
      <div className="model-view-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading model...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="model-view-container">
        <div className="error-state">
          <h2>Model not found</h2>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="model-view-container">
      {/* Header */}
      <div className="model-view-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="header-info">
          <h1>{model.name}</h1>
          <div className="header-meta">
            {model.age && <span>{model.age} years</span>}
            {model.attributes?.gender && <span>• {model.attributes.gender}</span>}
            {model.nationality && <span>• {model.nationality}</span>}
          </div>
        </div>
        <div className="credits-display">
          <div className="credits-icon">💎</div>
          <div className="credits-info">
            <span className="credits-label">Credits</span>
            <span className="credits-value">{credits !== null ? credits : '...'}</span>
          </div>
        </div>
      </div>

      <div className="model-view-content">
        {/* Left Sidebar - Model Info */}
        <div className="model-sidebar">
          <div className="info-card">
            <h3>Model Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Name</span>
                <span className="value">{model.name}</span>
              </div>
              {model.age && (
                <div className="info-item">
                  <span className="label">Age</span>
                  <span className="value">{model.age}</span>
                </div>
              )}
              {model.attributes?.gender && (
                <div className="info-item">
                  <span className="label">Gender</span>
                  <span className="value">{model.attributes.gender}</span>
                </div>
              )}
              {model.nationality && (
                <div className="info-item">
                  <span className="label">Nationality</span>
                  <span className="value">{model.nationality}</span>
                </div>
              )}
              {model.height && (
                <div className="info-item">
                  <span className="label">Height</span>
                  <span className="value">{model.height}</span>
                </div>
              )}
            </div>
          </div>

          {model.attributes && Object.keys(model.attributes).length > 0 && (
            <div className="info-card">
              <h3>Attributes</h3>
              <div className="attributes-list">
                {model.attributes.hairColor && (
                  <div className="attribute-tag">
                    {model.attributes.hairLength} {model.attributes.hairStyle} {model.attributes.hairColor} hair
                  </div>
                )}
                {model.attributes.eyeColor && (
                  <div className="attribute-tag">{model.attributes.eyeColor} eyes</div>
                )}
                {model.attributes.skinTone && (
                  <div className="attribute-tag">{model.attributes.skinTone} skin</div>
                )}
                {model.attributes.bodyType && (
                  <div className="attribute-tag">{model.attributes.bodyType} build</div>
                )}
                {model.attributes.style && (
                  <div className="attribute-tag">{model.attributes.style} style</div>
                )}
              </div>
            </div>
          )}

          <div className="stats-card">
            <h3>Statistics</h3>
            <div className="stat-item">
              <span className="stat-value">{model.generated_images?.length || 0}</span>
              <span className="stat-label">Total Images</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{model.generation_count || 0}</span>
              <span className="stat-label">Generations</span>
            </div>
          </div>

          <div className="settings-card">
            <h3>Settings</h3>
            <div className="nsfw-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={nsfwEnabled}
                  onChange={(e) => setNsfwEnabled(e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">NSFW Content</span>
              </label>
              <p className="toggle-description">
                Enable to allow NSFW content in image generation
              </p>
            </div>
          </div>
        </div>

        {/* Main Content - Images Gallery & Chat */}
        <div className="model-main">
          {/* Images Gallery */}
          <div className="images-section">
            <h2>Generated Images ({model.generated_images?.length || 0})</h2>

            {model.generated_images && model.generated_images.length > 0 ? (
              <div className="images-gallery">
                {model.generated_images.map((img, index) => (
                  <div
                    key={img.id || index}
                    className={`gallery-item ${selectedImages.includes(img.id) ? 'selected' : ''}`}
                    onClick={(e) => handleImageSelect(img.id, e)}
                  >
                    <img src={img.image_url} alt={`Generated ${index + 1}`} />
                    <button
                      className="image-maximize-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnlargedImage(img.image_url);
                      }}
                      aria-label="View full size"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                      </svg>
                    </button>
                    {img.is_selected && (
                      <div className="main-badge">Main</div>
                    )}
                    {selectedImages.includes(img.id) && (
                      <div className="selected-overlay">
                        <span>✓</span>
                      </div>
                    )}
                    <div className="image-actions">
                      <button
                        className="image-action-btn edit-btn"
                        onClick={(e) => handleEditImage(img, e)}
                        title="Edit image"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.333 2.00004C11.5084 1.82464 11.7163 1.68576 11.9447 1.59203C12.1731 1.4983 12.4173 1.45166 12.6637 1.45474C12.91 1.45783 13.1533 1.51058 13.3792 1.60997C13.605 1.70936 13.8092 1.85345 13.9807 2.02495C14.1522 2.19645 14.2963 2.40067 14.3957 2.62652C14.4951 2.85237 14.5478 3.09561 14.5509 3.34195C14.554 3.58829 14.5074 3.83253 14.4136 4.06093C14.3199 4.28933 14.181 4.49719 14.0057 4.67262L13.0057 5.67262L10.333 3.00004L11.333 2.00004ZM9.28533 4.04771L12.0057 6.76804L5.67199 13.1017C5.50024 13.2732 5.28767 13.3987 5.05333 13.467L2.05333 14.467C1.91409 14.5131 1.76537 14.5254 1.61969 14.5028C1.474 14.4802 1.33552 14.4232 1.21569 14.3364C1.09585 14.2496 0.998061 14.1357 0.930351 14.0035C0.862641 13.8713 0.826998 13.7246 0.82666 13.5757V10.5757C0.826585 10.4454 0.856239 10.3167 0.913326 10.1987C0.970413 10.0806 1.05345 9.97632 1.15666 9.89371L9.28533 4.04771Z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        className="image-action-btn delete-btn"
                        onClick={(e) => handleDeleteImage(img.id, e)}
                        title="Delete image"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6.5 1.99996C6.36739 1.99996 6.24021 2.05268 6.14645 2.14645C6.05268 2.24021 6 2.36739 6 2.49996V3.49996H3C2.86739 3.49996 2.74021 3.55268 2.64645 3.64645C2.55268 3.74021 2.5 3.86739 2.5 3.99996C2.5 4.13257 2.55268 4.25975 2.64645 4.35351C2.74021 4.44728 2.86739 4.49996 3 4.49996H4V12.5C4 13.163 4.26339 13.7989 4.73223 14.2678C5.20107 14.7366 5.83696 15 6.5 15H10.5C11.163 15 11.7989 14.7366 12.2678 14.2678C12.7366 13.7989 13 13.163 13 12.5V4.49996H14C14.1326 4.49996 14.2598 4.44728 14.3536 4.35351C14.4473 4.25975 14.5 4.13257 14.5 3.99996C14.5 3.86739 14.4473 3.74021 14.3536 3.64645C14.2598 3.55268 14.1326 3.49996 14 3.49996H11V2.49996C11 2.36739 10.9473 2.24021 10.8536 2.14645C10.7598 2.05268 10.6326 1.99996 10.5 1.99996H6.5ZM6 5.49996C6 5.36739 6.05268 5.24021 6.14645 5.14645C6.24021 5.05268 6.36739 4.99996 6.5 4.99996C6.63261 4.99996 6.75979 5.05268 6.85355 5.14645C6.94732 5.24021 7 5.36739 7 5.49996V11.5C7 11.6326 6.94732 11.7598 6.85355 11.8536C6.75979 11.9473 6.63261 12 6.5 12C6.36739 12 6.24021 11.9473 6.14645 11.8536C6.05268 11.7598 6 11.6326 6 11.5V5.49996ZM10 5.49996C10 5.36739 10.0527 5.24021 10.1464 5.14645C10.2402 5.05268 10.3674 4.99996 10.5 4.99996C10.6326 4.99996 10.7598 5.05268 10.8536 5.14645C10.9473 5.24021 11 5.36739 11 5.49996V11.5C11 11.6326 10.9473 11.7598 10.8536 11.8536C10.7598 11.9473 10.6326 12 10.5 12C10.3674 12 10.2402 11.9473 10.1464 11.8536C10.0527 11.7598 10 11.6326 10 11.5V5.49996Z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-images">
                <p>No images generated yet. Use the chat below to create some!</p>
              </div>
            )}
          </div>

          {/* Chat Interface */}
          <div className="chat-section">
            {!nsfwEnabled ? (
              <>
                <h2>Generate More Images</h2>

            <div className="chat-container">
              <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.map((message, index) => (
                  <div key={index} className={`chat-message ${message.type}`}>
                    {message.type === 'user' && (
                      <div className="message-bubble user">
                        <p>{message.content}</p>
                      </div>
                    )}

                    {message.type === 'system' && (
                      <div className="message-bubble system">
                        <p>{message.content}</p>
                      </div>
                    )}

                    {message.type === 'generating' && (
                      <div className="generating-message">
                        <div className="generating-header">
                          <div className="generating-spinner"></div>
                          <span>Generating your images...</span>
                        </div>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar" 
                            style={{ width: `${generationProgress}%` }}
                          ></div>
                        </div>
                        <div className="generating-footer">
                          <span className="progress-text">
                            {generationProgress < 95 ? `${Math.round(generationProgress)}%` : 'Almost done...'}
                          </span>
                          <span className="time-text">
                            {timeRemaining > 0 ? `~${timeRemaining}s remaining` : 'Finishing up...'}
                          </span>
                        </div>
                      </div>
                    )}

                    {message.type === 'error' && (
                      <div className="message-bubble error">
                        <p>{message.content}</p>
                      </div>
                    )}

                    {message.type === 'images' && (
                      <div className="message-images">
                        <p className="images-label">{message.content}</p>
                        <div className="message-images-grid">
                          {message.images.map((imgUrl, i) => (
                            <img key={i} src={imgUrl} alt={`Generated ${i + 1}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="chat-input-area">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you'd like to generate... (e.g., 'petting her dog, smiling at the camera', 'in a coffee shop looking at camera')"
                  disabled={isGenerating}
                  rows={2}
                />
                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
              </>
            ) : (
              <>
                <h2>NSFW Chat</h2>
                <div className="nsfw-image-selector">
                  <div className="nsfw-image-preview">
                    {nsfwSelectedImage ? (
                      <div className="selected-image-preview">
                        <img 
                          src={nsfwSelectedImage.image_url || nsfwSelectedImage.url} 
                          alt="Selected for NSFW editing" 
                        />
                        <button 
                          className="remove-image-btn"
                          onClick={() => setNsfwSelectedImage(null)}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="image-selector-placeholder">
                        <input
                          type="file"
                          id="nsfwImageUpload"
                          accept="image/*"
                          onChange={handleNsfwImageUpload}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="nsfwImageUpload" className="upload-image-btn">
                          <span>📷</span>
                          <span>Upload Image</span>
                        </label>
                        <p className="or-text">or</p>
                        <p className="select-text">Select from gallery above</p>
                      </div>
                    )}
                  </div>
                  
                  {model.generated_images && model.generated_images.length > 0 && !nsfwSelectedImage && (
                    <div className="gallery-quick-select">
                      <p className="quick-select-label">Quick select from gallery:</p>
                      <div className="quick-select-grid">
                        {model.generated_images.slice(0, 6).map((img) => (
                          <div
                            key={img.id}
                            className="quick-select-item"
                            onClick={() => handleNsfwImageSelect(img)}
                          >
                            <img src={img.image_url} alt="Gallery image" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="chat-container">
                  <div className="chat-messages" ref={nsfwChatMessagesRef}>
                    {nsfwChatMessages.map((message, index) => (
                      <div key={index} className={`chat-message ${message.type}`}>
                        {message.type === 'user' && (
                          <div className="message-bubble user">
                            <p>{message.content}</p>
                          </div>
                        )}

                        {message.type === 'system' && (
                          <div className="message-bubble system">
                            <p>{message.content}</p>
                          </div>
                        )}

                        {message.type === 'generating' && (
                          <div className="generating-message">
                            <div className="generating-header">
                              <div className="generating-spinner"></div>
                              <span>Generating NSFW image...</span>
                            </div>
                          </div>
                        )}

                        {message.type === 'error' && (
                          <div className="message-bubble error">
                            <p>{message.content}</p>
                          </div>
                        )}

                        {message.type === 'images' && (
                          <div className="message-images">
                            <p className="images-label">{message.content}</p>
                            <div className="message-images-grid">
                              {message.images.map((imgUrl, i) => (
                                <div key={i} className="nsfw-result-image">
                                  <img src={imgUrl} alt={`Generated ${i + 1}`} />
                                  <button
                                    className="save-nsfw-btn"
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from('generated_images')
                                          .insert([{
                                            model_id: modelId,
                                            image_url: imgUrl,
                                            prompt: nsfwChatInput || 'NSFW generation',
                                            is_selected: false
                                          }]);
                                        if (error) throw error;
                                        await loadModel();
                                        setNsfwChatMessages(prev => [...prev, {
                                          type: 'system',
                                          content: 'Image saved to gallery!'
                                        }]);
                                      } catch (error) {
                                        console.error('Error saving NSFW image:', error);
                                        alert('Failed to save image');
                                      }
                                    }}
                                  >
                                    Save to Gallery
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="chat-input-area">
                    <textarea
                      value={nsfwChatInput}
                      onChange={(e) => setNsfwChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleNsfwSendMessage();
                        }
                      }}
                      placeholder={nsfwSelectedImage ? "Describe the changes you want to make..." : "Select or upload an image first, then describe changes..."}
                      disabled={isNsfwGenerating || !nsfwSelectedImage}
                      rows={2}
                    />
                    <button
                      className="send-btn"
                      onClick={handleNsfwSendMessage}
                      disabled={!nsfwChatInput.trim() || isNsfwGenerating || !nsfwSelectedImage}
                    >
                      {isNsfwGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Selection Modal */}
      {selectionImages && (
        <div className="selection-modal-overlay" onClick={handleCloseSelectionModal}>
          <div className="selection-modal" onClick={(e) => e.stopPropagation()}>
            <div className="selection-modal-header">
              <h2>Select an Image to Keep</h2>
              <button className="close-btn" onClick={handleCloseSelectionModal}>×</button>
            </div>
            
            <div className="selection-modal-content">
              <p className="selection-hint">Choose one image to save to your gallery. The others will be discarded.</p>
              
              <div className="selection-images-grid">
                {selectionImages.map((imgUrl, index) => (
                  <div
                    key={index}
                    className={`selection-image-item ${selectedImageIndex === index ? 'selected' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={imgUrl} alt={`Option ${index + 1}`} />
                    {selectedImageIndex === index && (
                      <div className="selection-check">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="12" fill="var(--primary-color)"/>
                          <path d="M7 12L11 16L17 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="selection-actions">
                <button className="btn-secondary" onClick={handleRegenerateImages}>
                  Regenerate
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleKeepImage}
                  disabled={selectedImageIndex === null || isSavingImage}
                >
                  {isSavingImage ? 'Saving...' : 'Keep Selected Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Image Modal */}
      {editingImage && (
        <div className="edit-modal-overlay" onClick={handleCloseEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h2>Edit Image</h2>
              <button className="close-btn" onClick={handleCloseEditModal}>×</button>
            </div>
            
            <div className="edit-modal-content">
              <div className="edit-preview">
                <canvas ref={canvasRef} className="edited-canvas"></canvas>
              </div>
              
              <div className="edit-controls">
                <div className="control-group">
                  <label>
                    Brightness: {imageFilters.brightness}%
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={imageFilters.brightness}
                      onChange={(e) => setImageFilters({...imageFilters, brightness: parseInt(e.target.value)})}
                    />
                  </label>
                </div>
                
                <div className="control-group">
                  <label>
                    Contrast: {imageFilters.contrast}%
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={imageFilters.contrast}
                      onChange={(e) => setImageFilters({...imageFilters, contrast: parseInt(e.target.value)})}
                    />
                  </label>
                </div>
                
                <div className="control-group">
                  <label>
                    Saturation: {imageFilters.saturation}%
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={imageFilters.saturation}
                      onChange={(e) => setImageFilters({...imageFilters, saturation: parseInt(e.target.value)})}
                    />
                  </label>
                </div>
                
                <div className="control-group">
                  <label>
                    Hue: {imageFilters.hue}°
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={imageFilters.hue}
                      onChange={(e) => setImageFilters({...imageFilters, hue: parseInt(e.target.value)})}
                    />
                  </label>
                </div>
                
                <div className="control-group">
                  <label>
                    Noise: {imageFilters.noise}
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={imageFilters.noise}
                      onChange={(e) => setImageFilters({...imageFilters, noise: parseInt(e.target.value)})}
                    />
                  </label>
                </div>
                
                <div className="edit-actions">
                  <button className="btn-secondary" onClick={() => setImageFilters({
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    hue: 0,
                    noise: 0
                  })}>
                    Reset
                  </button>
                  <button className="btn-primary" onClick={handleDownloadEditedImage}>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {enlargedImage && (
        <div className="image-lightbox-overlay" onClick={() => setEnlargedImage(null)}>
          <button
            className="lightbox-close-btn"
            onClick={() => setEnlargedImage(null)}
            aria-label="Close"
          >
            ×
          </button>
          <div className="lightbox-image-container" onClick={(e) => e.stopPropagation()}>
            <img src={enlargedImage} alt="Enlarged view" />
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelView;
