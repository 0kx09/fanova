import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModelPages.css';

function GenerationChoice() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);

  const handleMethodSelect = (method) => {
    // Disable upload method for now
    if (method === 'upload') {
      alert('Reference image upload is coming soon! Please use "Describe Your Model" for now.');
      return;
    }
    setSelectedMethod(method);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + uploadedImages.length > 3) {
      alert('You can only upload up to 3 reference images');
      return;
    }

    // Store both the blob URLs (for preview) and the actual File objects
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setUploadedImages([...uploadedImages, ...imageUrls]);
    setImageFiles([...imageFiles, ...files]);
  };

  const removeImage = (index) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  // Convert File to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleContinue = async () => {
    if (selectedMethod === 'upload') {
      if (uploadedImages.length < 3) {
        alert('Please upload 3 reference images');
        return;
      }

      // Get the current modelId
      const modelId = localStorage.getItem('currentModelId');

      if (!modelId) {
        alert('Model not found. Please start from the beginning.');
        navigate('/model-info');
        return;
      }

      try {
        // Convert all image files to base64
        const base64Images = await Promise.all(
          imageFiles.map(file => fileToBase64(file))
        );

        localStorage.setItem('generationMethod', 'upload');
        localStorage.setItem('referenceImages', JSON.stringify(base64Images));

        // Navigate with modelId in state
        navigate('/generate-results', { state: { modelId } });
      } catch (error) {
        console.error('Error converting images:', error);
        alert('Failed to process images. Please try again.');
      }
    } else if (selectedMethod === 'describe') {
      localStorage.setItem('generationMethod', 'describe');
      navigate('/facial-features');
    }
  };

  return (
    <div className="generation-choice-container">
      <div className="progress-bar">
        <div className="progress-step completed">1. Model Info</div>
        <div className="progress-step completed">2. Attributes</div>
        <div className="progress-step active">3. Generation</div>
      </div>

      <div className="generation-choice-card">
        <h2>Choose Generation Method</h2>
        <p className="section-subtitle">How would you like to create your AI model?</p>

        <div className="method-options">
          <div
            className={`method-card ${selectedMethod === 'upload' ? 'selected' : ''} coming-soon-card`}
            onClick={() => handleMethodSelect('upload')}
          >
            <span className="coming-soon-badge">Coming Soon</span>
            <div className="method-icon">📸</div>
            <h3>Upload Reference Images</h3>
            <p>Upload 3 photos of your desired model for accurate generation</p>
          </div>

          <div
            className={`method-card ${selectedMethod === 'describe' ? 'selected' : ''}`}
            onClick={() => handleMethodSelect('describe')}
          >
            <div className="method-icon">✨</div>
            <h3>Describe Your Model</h3>
            <p>Customize facial features and details to create a unique model</p>
          </div>
        </div>

        {selectedMethod === 'upload' && (
          <div className="upload-section">
            <h3>Upload Reference Images (3 required)</h3>
            <div className="upload-area">
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="imageUpload" className="upload-button">
                {uploadedImages.length === 0 ? (
                  <>
                    <div className="upload-icon">+</div>
                    <p>Click to upload images</p>
                  </>
                ) : (
                  <>
                    <div className="upload-icon">+</div>
                    <p>Add more images ({uploadedImages.length}/3)</p>
                  </>
                )}
              </label>
            </div>

            {uploadedImages.length > 0 && (
              <div className="uploaded-images">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="uploaded-image">
                    <img src={img} alt={`Upload ${index + 1}`} />
                    <button
                      className="remove-image"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedMethod === 'describe' && (
          <div className="describe-section">
            <div className="info-box">
              <p>You'll be able to customize:</p>
              <ul>
                <li>Face shape (Heart, Oval, Round, Square, etc.)</li>
                <li>Eye shape and type</li>
                <li>Nose shape</li>
                <li>Lip shape</li>
                <li>Pose and expression</li>
              </ul>
            </div>
          </div>
        )}

        <div className="button-group">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleContinue}
            disabled={!selectedMethod}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenerationChoice;
