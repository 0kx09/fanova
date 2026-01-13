import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModelPages.css';
import { updateModelFacialFeatures } from '../services/supabaseService';

function FacialFeatures() {
  const navigate = useNavigate();
  const [features, setFeatures] = useState({
    faceShape: '',
    eyeShape: '',
    noseShape: '',
    lipShape: '',
    pose: 'Front facing',
    expression: 'Smiling',
    lighting: 'Natural',
    setting: ''
  });
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSelect = (feature, value) => {
    setFeatures({
      ...features,
      [feature]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get modelId from localStorage
      const modelId = localStorage.getItem('currentModelId');

      if (!modelId) {
        alert('No model found. Please start from the beginning.');
        navigate('/model-info');
        return;
      }

      // Save facial features
      localStorage.setItem('facialFeatures', JSON.stringify(features));

      // Update model with facial features via API
      await updateModelFacialFeatures(modelId, features);

      // Navigate to generation results with modelId
      navigate('/generate-results', { state: { modelId } });
    } catch (error) {
      console.error('Error updating facial features:', error);
      alert('Failed to update facial features. Please try again.');
      setLoading(false);
    }
  };

  const faceShapes = [
    'Heart', 'Oval', 'Oblong', 'Round', 'Angular-Round',
    'Inverted Triangle', 'Diamond', 'Rectangle', 'Square', 'Triangle'
  ];

  const eyeShapes = [
    'Almond', 'Round', 'Protruding', 'Close-set',
    'Wide-set', 'Downturned', 'Upturned', 'Hooded', 'Monolid'
  ];

  const noseShapes = [
    'Droopy', 'Funnel', 'Upturned', 'Aquiline/Roman',
    'Grecian', 'Button', 'Small Button'
  ];

  const lipShapes = [
    'Full', 'Top-heavy', 'Wide', 'Round',
    'Bottom-heavy', 'Thin', 'Bow-shaped', 'Heart-shaped', 'Downturned'
  ];

  const poses = [
    'Front facing', 'Three-quarter view', 'Side profile',
    'Looking over shoulder', 'Tilted head', 'Looking up', 'Looking down'
  ];

  const expressions = [
    'Neutral', 'Smiling', 'Laughing', 'Serious',
    'Confident', 'Mysterious', 'Playful', 'Elegant'
  ];

  const lightingOptions = [
    'Natural', 'Studio', 'Golden hour', 'Dramatic',
    'Soft', 'Backlit', 'Ring light'
  ];

  const FeatureSelector = ({ title, options, selectedValue, onSelect }) => (
    <div className="feature-section">
      <h3>{title}</h3>
      <div className="feature-grid">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`feature-option ${selectedValue === option ? 'selected' : ''}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="facial-features-container">
      <div className="progress-steps">
        <div className="progress-step completed">1. Model Info</div>
        <div className="progress-step completed">2. Attributes</div>
        <div className="progress-step active">3. Generation</div>
      </div>

      <div className="facial-features-card">
        <h2>Customize Facial Features (Optional)</h2>
        <p className="section-subtitle">
          All fields are optional - we'll use natural defaults. Skip this or customize specific features you care about.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Quick defaults info */}
          <div className="defaults-info">
            <p>
              <strong>Default Settings:</strong> Front-facing pose, smiling expression, natural lighting
            </p>
          </div>

          {/* Basic customization - always visible */}
          <div className="feature-section">
            <h3>Expression</h3>
            <div className="feature-grid">
              {expressions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`feature-option ${features.expression === option ? 'selected' : ''}`}
                  onClick={() => handleSelect('expression', option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="feature-section">
            <h3>Setting/Location (Optional)</h3>
            <input
              type="text"
              className="setting-input"
              placeholder="e.g., bedroom, coffee shop, park, gym, car, beach..."
              value={features.setting}
              onChange={(e) => setFeatures({ ...features, setting: e.target.value })}
            />
            <p className="setting-hint">Leave blank for a simple indoor background</p>
          </div>

          {/* Advanced options toggle */}
          <div className="advanced-toggle-section">
            <button
              type="button"
              className="advanced-toggle-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Customization (Face shape, eyes, nose, etc.)
            </button>
          </div>

          {/* Advanced options - collapsible */}
          {showAdvanced && (
            <div className="advanced-section">
              <FeatureSelector
                title="Face Shape"
                options={faceShapes}
                selectedValue={features.faceShape}
                onSelect={(value) => handleSelect('faceShape', value)}
              />

              <FeatureSelector
                title="Eye Shape"
                options={eyeShapes}
                selectedValue={features.eyeShape}
                onSelect={(value) => handleSelect('eyeShape', value)}
              />

              <FeatureSelector
                title="Nose Shape"
                options={noseShapes}
                selectedValue={features.noseShape}
                onSelect={(value) => handleSelect('noseShape', value)}
              />

              <FeatureSelector
                title="Lip Shape"
                options={lipShapes}
                selectedValue={features.lipShape}
                onSelect={(value) => handleSelect('lipShape', value)}
              />

              <FeatureSelector
                title="Pose"
                options={poses}
                selectedValue={features.pose}
                onSelect={(value) => handleSelect('pose', value)}
              />

              <FeatureSelector
                title="Lighting"
                options={lightingOptions}
                selectedValue={features.lighting}
                onSelect={(value) => handleSelect('lighting', value)}
              />
            </div>
          )}

          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={loading}>
              Back
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Images'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FacialFeatures;
