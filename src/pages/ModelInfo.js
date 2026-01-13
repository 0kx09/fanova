import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModelPages.css';
import { createModel } from '../services/supabaseService';
import { generateModelName } from '../services/api';

function ModelInfo() {
  const navigate = useNavigate();
  const [modelData, setModelData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    nationality: '',
    occupation: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatingName, setGeneratingName] = useState(false);

  const handleChange = (e) => {
    setModelData({
      ...modelData,
      [e.target.name]: e.target.value
    });
  };

  const handleGenerateName = async () => {
    setGeneratingName(true);
    try {
      const context = {
        nationality: modelData.nationality || undefined,
        occupation: modelData.occupation || undefined
      };
      
      const generatedName = await generateModelName(context);
      setModelData({
        ...modelData,
        name: generatedName
      });
    } catch (error) {
      console.error('Error generating name:', error);
      alert('Failed to generate name. Please try again or enter a name manually.');
    } finally {
      setGeneratingName(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate age if provided
      if (modelData.age && (isNaN(modelData.age) || parseInt(modelData.age) < 18)) {
        alert('Age must be 18 or older, or leave it empty.');
        setLoading(false);
        return;
      }

      // Create model in Supabase
      const model = await createModel(modelData);

      // Store modelId for later use
      localStorage.setItem('currentModelId', model.id);
      console.log('Model created in Supabase with ID:', model.id);

      navigate('/model-attributes');
    } catch (error) {
      console.error('Error creating model:', error);
      alert(error.message || 'Failed to create model. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="model-info-container">
      <div className="progress-steps">
        <div className="progress-step active">1. Model Info</div>
        <div className="progress-step">2. Attributes</div>
        <div className="progress-step">3. Generation</div>
      </div>

      <div className="model-info-card">
        <h2>Model Information</h2>
        <p className="section-subtitle">Tell us about your AI model</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Model Name *</label>
              <div className="name-input-wrapper">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={modelData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Sophia"
                />
                <button
                  type="button"
                  className="ai-generate-name-btn"
                  onClick={handleGenerateName}
                  disabled={generatingName}
                  title="Generate name with AI"
                >
                  {generatingName ? (
                    <span className="spinner">⟳</span>
                  ) : (
                    <span>✨ AI</span>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="age">Age (optional, must be 18+)</label>
              <input
                type="number"
                id="age"
                name="age"
                value={modelData.age}
                onChange={handleChange}
                min="18"
                placeholder="e.g., 25"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="height">Height (cm)</label>
              <input
                type="number"
                id="height"
                name="height"
                value={modelData.height}
                onChange={handleChange}
                placeholder="e.g., 175"
              />
            </div>

            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={modelData.weight}
                onChange={handleChange}
                placeholder="e.g., 60"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nationality">Nationality</label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                value={modelData.nationality}
                onChange={handleChange}
                placeholder="e.g., American"
              />
            </div>

            <div className="form-group">
              <label htmlFor="occupation">Occupation</label>
              <input
                type="text"
                id="occupation"
                name="occupation"
                value={modelData.occupation}
                onChange={handleChange}
                placeholder="e.g., Fashion Model"
              />
            </div>
          </div>

          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={loading}>
              Back
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Next: Attributes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModelInfo;
