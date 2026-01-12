import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ModelPages.css';
import { generateModelImages } from '../services/api';
import { saveGeneratedImages, selectModelImage } from '../services/supabaseService';
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
  const hasGenerated = useRef(false);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    const generateImages = async () => {
      // Prevent double generation
      if (hasGenerated.current) {
        return;
      }
      hasGenerated.current = true;

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
        // Get modelId from location state or localStorage
        const modelId = location.state?.modelId || localStorage.getItem('currentModelId');

        if (!modelId) {
          setError('No model found. Please create a model first.');
          setGenerating(false);
          return;
        }

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

          // Save images to Supabase
          try {
            const imageUrls = response.images;
            const savedImages = await saveGeneratedImages(modelId, imageUrls, response.prompt || '');
            console.log('Images saved to Supabase:', savedImages);

            // Store the saved image IDs so we can reference them later
            const imagesWithDbIds = images.map((img, index) => ({
              ...img,
              dbId: savedImages[index].id
            }));
            setGeneratedImages(imagesWithDbIds);
          } catch (dbError) {
            console.error('Error saving images to Supabase:', dbError);
            // Don't fail the whole process if Supabase save fails
            // User can still see and select images
          }
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
  }, []);

  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showPlanSelection, setShowPlanSelection] = useState(false);

  const handleSelectImage = (index) => {
    setSelectedImageIndex(index);
  };

  const handleConfirmSelection = async () => {
    if (selectedImageIndex === null) {
      alert('Please select an image first');
      return;
    }

    // Show plan selection instead of going directly to dashboard
    setShowPlanSelection(true);
  };

  const handleRegenerate = () => {
    setGenerating(true);
    setSelectedImageIndex(null);
    setTimeout(() => {
      setGenerating(false);
    }, 3000);
  };

  const handleCreateNew = () => {
    // Clear all stored data
    localStorage.removeItem('modelInfo');
    localStorage.removeItem('modelAttributes');
    localStorage.removeItem('generationMethod');
    localStorage.removeItem('facialFeatures');
    localStorage.removeItem('currentModelId');
    navigate('/model-info');
  };

  return (
    <div className="generate-results-container">
      <div className="progress-bar">
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
              <h2>Your AI Model Images</h2>
              <p className="section-subtitle">
                {imagesGenerated} free images generated successfully!
              </p>
              {generatedPrompt && (
                <div className="prompt-display">
                  <strong>Generated Prompt:</strong>
                  <p>{generatedPrompt}</p>
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
                  Choose Plan & Continue
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
                {(() => {
                  const modelInfo = JSON.parse(localStorage.getItem('modelInfo') || '{}');
                  const attributes = JSON.parse(localStorage.getItem('modelAttributes') || '{}');
                  const features = JSON.parse(localStorage.getItem('facialFeatures') || '{}');

                  return (
                    <>
                      <div className="summary-section">
                        <strong>Basic Info:</strong>
                        <p>Name: {modelInfo.name || 'N/A'}</p>
                        {modelInfo.age && <p>Age: {modelInfo.age}</p>}
                        {modelInfo.nationality && <p>Nationality: {modelInfo.nationality}</p>}
                      </div>

                      <div className="summary-section">
                        <strong>Attributes:</strong>
                        {attributes.hairColor && <p>Hair: {attributes.hairColor} {attributes.hairStyle}</p>}
                        {attributes.eyeColor && <p>Eyes: {attributes.eyeColor}</p>}
                        {attributes.style && <p>Style: {attributes.style}</p>}
                      </div>

                      {features.faceShape && (
                        <div className="summary-section">
                          <strong>Facial Features:</strong>
                          <p>Face: {features.faceShape}</p>
                          {features.eyeShape && <p>Eye Shape: {features.eyeShape}</p>}
                          {features.noseShape && <p>Nose: {features.noseShape}</p>}
                          {features.lipShape && <p>Lips: {features.lipShape}</p>}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GenerateResults;
