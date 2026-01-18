import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { supabase } from '../lib/supabase';
import './AttributesConfirmation.css';

function AttributesConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    name,
    age,
    nationality,
    occupation,
    referenceImages,
    analysis,
    extractedAttributes,
    mergedPrompt
  } = location.state || {};

  const [attributes, setAttributes] = useState(extractedAttributes || {});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleAttributeChange = (key, value) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCreateModel = async () => {
    setIsCreating(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to create a model');
      }

      // Parse and validate age - convert empty string to null for integer field
      let ageValue = null;
      if (age && age !== '') {
        const parsedAge = parseInt(age);
        if (!isNaN(parsedAge) && parsedAge >= 18) {
          ageValue = parsedAge;
        } else if (!isNaN(parsedAge) && parsedAge < 18) {
          throw new Error('Age must be 18 or older');
        }
      }

      // Create model in database
      const { data: model, error: modelError } = await supabase
        .from('models')
        .insert({
          user_id: user.id,
          name: name,
          age: ageValue, // Use parsed age or null, never empty string
          nationality: nationality || null, // Convert empty string to null
          occupation: occupation || null, // Convert empty string to null
          attributes: attributes,
          ai_analysis: analysis,
          merged_prompt: mergedPrompt,
          reference_images: referenceImages,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (modelError) {
        console.error('Error creating model:', modelError);
        throw new Error('Failed to create model. Please try again.');
      }

      console.log('Model created successfully:', model);

      // Navigate to generate results page
      navigate('/generate-results', {
        state: {
          modelId: model.id,
          modelName: model.name,
          mergedPrompt: mergedPrompt,
          referenceImages: referenceImages,
          isFirstGeneration: true
        }
      });

    } catch (err) {
      console.error('Error creating model:', err);
      setError(err.message || 'Failed to create model. Please try again.');
      setIsCreating(false);
    }
  };

  // If no data, redirect back
  if (!extractedAttributes || !analysis) {
    return (
      <>
        <Navigation />
        <div className="attributes-confirmation-container">
          <div className="error-state">
            <h2>No Analysis Data Found</h2>
            <p>Please upload reference images first.</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/model-info')}
            >
              Start Over
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="attributes-confirmation-container">
        <div className="attributes-confirmation-card">
          <div className="attributes-header">
            <h1>Confirm Model Attributes</h1>
            <p className="subtitle">
              AI has analyzed your reference images and extracted these attributes.
              Please review and adjust if needed.
            </p>
          </div>

          {/* Reference Images Preview */}
          <div className="reference-preview-section">
            <h3>Reference Images</h3>
            <div className="reference-preview-grid">
              {referenceImages?.map((img, index) => (
                <div key={index} className="reference-thumb">
                  <img src={img} alt={`Reference ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Summary */}
          <div className="analysis-section">
            <h3>🤖 AI Analysis Summary</h3>
            <div className="analysis-grid">
              {analysis?.map((desc, index) => (
                <div key={index} className="analysis-card">
                  <div className="analysis-label">Image {index + 1} Analysis</div>
                  <p className="analysis-text">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted Attributes */}
          <div className="attributes-section">
            <h3>✨ Extracted Attributes</h3>
            <div className="attributes-grid">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="attribute-item">
                  <label className="attribute-label">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>

                  {/* Gender dropdown */}
                  {key === 'gender' ? (
                    <select
                      value={value}
                      onChange={(e) => handleAttributeChange(key, e.target.value)}
                      className="attribute-input"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  )

                  /* Clothing coverage dropdown */
                  : key === 'clothing_coverage' ? (
                    <select
                      value={value}
                      onChange={(e) => handleAttributeChange(key, e.target.value)}
                      className="attribute-input"
                    >
                      <option value="modest">Modest (Conservative)</option>
                      <option value="average">Average (Standard)</option>
                      <option value="revealing">Revealing (Provocative)</option>
                    </select>
                  )

                  /* Clothing style dropdown */
                  : key === 'clothing_style' ? (
                    <select
                      value={value}
                      onChange={(e) => handleAttributeChange(key, e.target.value)}
                      className="attribute-input"
                    >
                      <option value="casual">Casual</option>
                      <option value="elegant">Elegant</option>
                      <option value="athletic">Athletic</option>
                      <option value="modest">Modest</option>
                      <option value="provocative">Provocative</option>
                      <option value="professional">Professional</option>
                      <option value="streetwear">Streetwear</option>
                    </select>
                  )

                  /* Makeup style dropdown */
                  : key === 'makeup_style' ? (
                    <select
                      value={value}
                      onChange={(e) => handleAttributeChange(key, e.target.value)}
                      className="attribute-input"
                    >
                      <option value="natural">Natural</option>
                      <option value="minimal">Minimal</option>
                      <option value="glamorous">Glamorous</option>
                      <option value="bold">Bold</option>
                      <option value="heavy">Heavy</option>
                      <option value="none">No Makeup</option>
                    </select>
                  )

                  /* Default text input for other attributes */
                  : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleAttributeChange(key, e.target.value)}
                      className="attribute-input"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Merged Prompt Preview */}
          <div className="prompt-preview-section">
            <h3>📝 Merged Generation Prompt</h3>
            <div className="prompt-preview">
              {mergedPrompt}
            </div>
            <p className="prompt-hint">
              This prompt will be used to generate consistent images of your model.
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="button-group">
            <button
              className="btn-secondary"
              onClick={() => navigate(-1)}
              disabled={isCreating}
            >
              ← Back to Images
            </button>
            <button
              className="btn-primary"
              onClick={handleCreateModel}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <span className="spinner"></span>
                  Creating Model...
                </>
              ) : (
                'Create Model & Generate Images →'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AttributesConfirmation;
