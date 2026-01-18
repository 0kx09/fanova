import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import './ReferenceImagesUpload.css';

function ReferenceImagesUpload() {
  const navigate = useNavigate();
  const location = useLocation();
  const modelData = location.state || {};

  const [images, setImages] = useState([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState([null, null, null]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (index, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload only image files (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    const newImages = [...images];
    newImages[index] = file;
    setImages(newImages);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const newPreviews = [...imagePreviews];
      newPreviews[index] = reader.result;
      setImagePreviews(newPreviews);
    };
    reader.readAsDataURL(file);

    setError('');
  };

  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages[index] = null;
    setImages(newImages);

    const newPreviews = [...imagePreviews];
    newPreviews[index] = null;
    setImagePreviews(newPreviews);
  };

  const handleAnalyzeImages = async () => {
    // Validate all 3 images are uploaded
    const uploadedCount = images.filter(img => img !== null).length;
    if (uploadedCount < 3) {
      setError(`Please upload all 3 reference images (${uploadedCount}/3 uploaded)`);
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // Convert images to base64
      const imageBase64Array = await Promise.all(
        images.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      // Call OpenAI Vision API to analyze images
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/ai/analyze-reference-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imageBase64Array,
          modelName: modelData.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze images');
      }

      const analysisResult = await response.json();

      // Navigate to attributes confirmation page with analysis results
      navigate('/attributes-confirmation', {
        state: {
          ...modelData,
          referenceImages: imageBase64Array,
          analysis: analysisResult.analysis,
          extractedAttributes: analysisResult.extractedAttributes,
          mergedPrompt: analysisResult.mergedPrompt
        }
      });

    } catch (err) {
      console.error('Error analyzing images:', err);
      setError(err.message || 'Failed to analyze images. Please try again.');
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="reference-images-container">
        <div className="reference-images-card">
          <div className="reference-images-header">
            <h1>Upload Reference Images</h1>
            <p className="subtitle">
              Upload 3 high-quality images of your model for AI analysis.
              These can be from Reddit, social media, or any source.
            </p>
          </div>

          <div className="upload-grid">
            {[0, 1, 2].map((index) => (
              <div key={index} className="upload-box">
                <div className="upload-number">Image {index + 1}</div>

                {!imagePreviews[index] ? (
                  <label className="upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(index, e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-icon">📷</div>
                    <div className="upload-text">Click to upload</div>
                    <div className="upload-hint">JPG, PNG (max 10MB)</div>
                  </label>
                ) : (
                  <div className="image-preview">
                    <img src={imagePreviews[index]} alt={`Reference ${index + 1}`} />
                    <button
                      className="remove-image-btn"
                      onClick={() => handleRemoveImage(index)}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="tips-section">
            <h3>💡 Tips for Best Results</h3>
            <ul>
              <li>Use clear, high-resolution images</li>
              <li>Choose images with good lighting</li>
              <li>Include different angles or poses for variety</li>
              <li>Make sure the person's face is clearly visible</li>
              <li>Avoid heavily filtered or edited images</li>
            </ul>
          </div>

          <div className="button-group">
            <button
              className="btn-secondary"
              onClick={() => navigate('/model-info', { state: modelData })}
              disabled={isAnalyzing}
            >
              ← Back
            </button>
            <button
              className="btn-primary"
              onClick={handleAnalyzeImages}
              disabled={isAnalyzing || images.filter(img => img).length < 3}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner"></span>
                  Analyzing Images...
                </>
              ) : (
                'Analyze Images →'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReferenceImagesUpload;
