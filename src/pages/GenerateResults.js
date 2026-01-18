import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ModelPages.css';
import { generateModelImages, updateLockedReferenceImage } from '../services/api';
import { saveGeneratedImages, getModel, getUserProfile } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import PlanSelection from '../components/PlanSelection';

function GenerateResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const [generating, setGenerating] = useState(true);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imagesGenerated, setImagesGenerated] = useState(0);
  const [error, setError] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [modelData, setModelData] = useState(null);
  const hasGenerated = useRef(false);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    const generateImages = async () => {
      // Prevent double generation
      if (hasGenerated.current) {
        return;
      }
      hasGenerated.current = true;

      // Get modelId from location state or localStorage
      const modelId = location.state?.modelId || localStorage.getItem('currentModelId');

      if (!modelId) {
        setError('No model found. Please create a model first.');
        setGenerating(false);
        return;
      }

      // Fetch model data from Supabase
      try {
        const model = await getModel(modelId);
        setModelData(model);
        console.log('Fetched model data:', model);
      } catch (err) {
        console.error('Error fetching model data:', err);
        // Don't fail if we can't fetch model data, just log it
      }

      // Check if user has a subscription plan
      try {
        const profile = await getUserProfile();
        setHasSubscriptionPlan(profile.subscription_plan && profile.subscription_plan !== null);
      } catch (err) {
        console.error('Error checking subscription plan:', err);
        setHasSubscriptionPlan(false);
      }

      // Start progress animation (60 seconds = 1 minute)
      setGenerationProgress(0);
      setTimeRemaining(60);
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
        console.log('Generating images for model:', modelId);

        // Check if using reference images
        const generationMethod = localStorage.getItem('generationMethod');
        const referenceImagesJson = localStorage.getItem('referenceImages');
        let referenceImages = null;

        if (generationMethod === 'upload' && referenceImagesJson) {
          try {
            referenceImages = JSON.parse(referenceImagesJson);
            console.log('Using reference images:', referenceImages.length);
          } catch (e) {
            console.error('Failed to parse reference images:', e);
          }
        }

        // Call API to generate images (with or without reference images)
        const response = await generateModelImages(modelId, 3, referenceImages);

        if (response.success && response.images) {
          const images = response.images.map((url, index) => ({
            id: index + 1,
            url: url
          }));

          setGeneratedImages(images);
          setImagesGenerated(images.length);
          setGeneratedPrompt(response.prompt || '');
          console.log('Images generated successfully:', images);
          // Note: Images are NOT saved to Supabase yet - only the selected image will be saved
        } else {
          throw new Error('Failed to generate images');
        }

        // Clear progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        // Complete progress to 100%
        setGenerationProgress(100);
        setTimeRemaining(0);
        
        // Small delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setGenerating(false);
      } catch (err) {
        console.error('Error generating images:', err);
        
        // Clear progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        // Reset progress
        setGenerationProgress(0);
        setTimeRemaining(60);
        
        setError(err.message || 'Failed to generate images. Please check your API key.');
        setGenerating(false);
      }
    };

    generateImages();

    // Cleanup progress interval on unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [hasSubscriptionPlan, setHasSubscriptionPlan] = useState(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const handleSelectImage = (index) => {
    setSelectedImageIndex(index);
  };

  const handleConfirmSelection = async () => {
    if (selectedImageIndex === null) {
      alert('Please select an image to use as your reference first');
      return;
    }

    try {
      const modelId = location.state?.modelId || localStorage.getItem('currentModelId');
      const selectedImage = generatedImages[selectedImageIndex];

      if (!modelId || !selectedImage) {
        alert('Error: Model or image data not found');
        return;
      }

      // CRITICAL: Save ONLY the selected image to Supabase, then lock it as reference
      console.log(`💾 Saving selected image ${selectedImageIndex + 1} to database...`);

      // Save only the selected image to generated_images table
      let savedImage;
      try {
        const savedImages = await saveGeneratedImages(
          modelId,
          [selectedImage.url], // Only save the selected image
          generatedPrompt || ''
        );
        savedImage = savedImages[0];
        console.log('✅ Selected image saved to database:', savedImage);
      } catch (saveError) {
        console.error('Error saving selected image:', saveError);
        alert('Failed to save selected image. Please try again.');
        return;
      }

      // Lock this image as the reference image
      console.log(`🔒 Locking image as reference for model ${modelId}`);
      try {
        // Use the saved image ID to avoid sending large base64 URLs
        await updateLockedReferenceImage(modelId, null, savedImage.id);
        console.log('✅ Reference image locked successfully');
      } catch (updateError) {
        console.error('Error locking reference image:', updateError);
        alert('Failed to lock reference image. Please try again.');
        return;
      }

      // Check if user has subscription plan
      const profile = await getUserProfile();

      if (profile.subscription_plan && profile.subscription_plan !== null) {
        // User has plan - go to dashboard
        navigate('/dashboard');
      } else {
        // No plan - show plan selection
        setShowPlanSelection(true);
      }
    } catch (error) {
      console.error('Error confirming selection:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleRegenerate = () => {
    setGenerating(true);
    setSelectedImageIndex(null);
    setTimeout(() => {
      setGenerating(false);
    }, 3000);
  };

  return (
    <div className="generate-results-container">
      <div className="progress-steps">
        <div className="progress-step completed">1. Model Info</div>
        <div className="progress-step completed">2. Attributes</div>
        <div className="progress-step completed">3. Generation</div>
      </div>

      <div className="generate-results-card">
        {generating ? (
          <div className="generating-section">
            <div className="generating-spinner"></div>
            <h2>Generating Your AI Model...</h2>
            <p>Creating beautiful images just for you...</p>
            
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
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
        ) : error ? (
          <div className="error-section">
            <h2>Error</h2>
            <p className="error-message">{error}</p>
            <button className="btn-primary" onClick={() => navigate('/model-info')}>
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="results-header">
              <h2>Select Your Reference Image</h2>
              <p className="section-subtitle">
                Choose ONE image that will be used as your model's locked reference for all future generations. This ensures perfect consistency!
              </p>
              <div className="reference-notice">
                <strong>📌 Important:</strong> The image you select will be the foundation for all future images of this model. Pick the one with the clearest face, good lighting, and best captures the model's appearance.
              </div>
              {generatedPrompt && (
                <div className="prompt-display">
                  <strong>Generated Prompt:</strong>
                  <p className={promptExpanded ? 'expanded' : 'truncated'}>
                    {generatedPrompt}
                  </p>
                  <button
                    className="prompt-toggle-btn"
                    onClick={() => setPromptExpanded(!promptExpanded)}
                  >
                    {promptExpanded ? 'Show less' : 'View all'}
                  </button>
                </div>
              )}
            </div>

            <div className="generated-images-grid">
              {generatedImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`generated-image-card ${selectedImageIndex === index ? 'selected' : ''}`}
                  onClick={() => handleSelectImage(index)}
                >
                  <img src={image.url} alt={`Generated ${index + 1}`} />
                  <button
                    className="image-maximize-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnlargedImage(image.url);
                    }}
                    aria-label="View full size"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                  <div className="image-actions">
                    <button
                      className={`btn-select ${selectedImageIndex === index ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectImage(index);
                      }}
                    >
                      {selectedImageIndex === index ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                  {selectedImageIndex === index && (
                    <div className="selected-badge">
                      <span>✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

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

            <div className="results-info">
              <div className="info-card">
                <h3>Select Your Favorite</h3>
                <p>Choose the image that best represents your model.</p>
                <p className="info-text">You can regenerate or create more images from your dashboard later.</p>
              </div>
            </div>

            {!showPlanSelection ? (
              <div className="action-buttons">
                <button className="btn-secondary" onClick={handleRegenerate}>
                  Regenerate Images
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmSelection}
                  disabled={selectedImageIndex === null}
                >
                  {hasSubscriptionPlan ? 'Continue to Dashboard' : 'Choose Plan & Continue'}
                </button>
              </div>
            ) : (
              <PlanSelection
                modelId={location.state?.modelId || localStorage.getItem('currentModelId')}
                selectedImageId={generatedImages[selectedImageIndex]?.dbId}
                onPaymentComplete={() => {
                  navigate('/dashboard');
                }}
                onClose={() => setShowPlanSelection(false)}
              />
            )}

            <div className="model-summary">
              <h3>Model Summary</h3>
              <div className="summary-content">
                {modelData ? (
                  <>
                    <div className="summary-section">
                      <strong>Basic Info:</strong>
                      <p>Name: {modelData.name || 'N/A'}</p>
                      {modelData.age && <p>Age: {modelData.age}</p>}
                      {modelData.nationality && <p>Nationality: {modelData.nationality}</p>}
                      {modelData.occupation && <p>Occupation: {modelData.occupation}</p>}
                    </div>

                    {modelData.attributes && (
                      <div className="summary-section">
                        <strong>Attributes:</strong>
                        {modelData.attributes.gender && <p>Gender: {modelData.attributes.gender}</p>}
                        {modelData.attributes.hairColor && <p>Hair: {modelData.attributes.hairColor} {modelData.attributes.hairStyle}</p>}
                        {modelData.attributes.eyeColor && <p>Eyes: {modelData.attributes.eyeColor}</p>}
                        {modelData.attributes.skinTone && <p>Skin: {modelData.attributes.skinTone}</p>}
                        {modelData.attributes.style && <p>Style: {modelData.attributes.style}</p>}
                      </div>
                    )}

                    {modelData.facial_features && (
                      <div className="summary-section">
                        <strong>Facial Features:</strong>
                        {modelData.facial_features.faceShape && <p>Face: {modelData.facial_features.faceShape}</p>}
                        {modelData.facial_features.eyeShape && <p>Eye Shape: {modelData.facial_features.eyeShape}</p>}
                        {modelData.facial_features.noseShape && <p>Nose: {modelData.facial_features.noseShape}</p>}
                        {modelData.facial_features.lipShape && <p>Lips: {modelData.facial_features.lipShape}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="loading-text">Loading model data...</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GenerateResults;
