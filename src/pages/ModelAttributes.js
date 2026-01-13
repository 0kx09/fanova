import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModelPages.css';
import { updateModelAttributes } from '../services/supabaseService';

function ModelAttributes() {
  const navigate = useNavigate();
  const [attributes, setAttributes] = useState({
    gender: '',
    hairColor: '',
    hairStyle: '',
    hairLength: '',
    eyeColor: '',
    skinTone: '',
    bodyType: '',
    style: '',
    personality: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setAttributes({
      ...attributes,
      [e.target.name]: e.target.value
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

      // Update model with attributes in Supabase
      await updateModelAttributes(modelId, attributes);

      console.log('Attributes updated in Supabase for model:', modelId);
      navigate('/generation-choice');
    } catch (error) {
      console.error('Error updating attributes:', error);
      alert('Failed to update attributes. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="model-attributes-container">
      <div className="progress-steps">
        <div className="progress-step completed">1. Model Info</div>
        <div className="progress-step active">2. Attributes</div>
        <div className="progress-step">3. Generation</div>
      </div>

      <div className="model-attributes-card">
        <h2>Model Attributes</h2>
        <p className="section-subtitle">Define your model's characteristics</p>

        <form onSubmit={handleSubmit}>
          <div className="attribute-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gender">Gender *</label>
                <select
                  id="gender"
                  name="gender"
                  value={attributes.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select...</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-Binary</option>
                </select>
              </div>
            </div>
          </div>

          <div className="attribute-section">
            <h3>Hair</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hairColor">Hair Color</label>
                <select
                  id="hairColor"
                  name="hairColor"
                  value={attributes.hairColor}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="black">Black</option>
                  <option value="brown">Brown</option>
                  <option value="blonde">Blonde</option>
                  <option value="red">Red</option>
                  <option value="auburn">Auburn</option>
                  <option value="gray">Gray/Silver</option>
                  <option value="platinum">Platinum</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="hairStyle">Hair Style</label>
                <select
                  id="hairStyle"
                  name="hairStyle"
                  value={attributes.hairStyle}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="straight">Straight</option>
                  <option value="wavy">Wavy</option>
                  <option value="curly">Curly</option>
                  <option value="coily">Coily</option>
                  <option value="braided">Braided</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="hairLength">Hair Length</label>
                <select
                  id="hairLength"
                  name="hairLength"
                  value={attributes.hairLength}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                  <option value="very-long">Very Long</option>
                </select>
              </div>
            </div>
          </div>

          <div className="attribute-section">
            <h3>Physical Features</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="eyeColor">Eye Color</label>
                <select
                  id="eyeColor"
                  name="eyeColor"
                  value={attributes.eyeColor}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="brown">Brown</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="hazel">Hazel</option>
                  <option value="gray">Gray</option>
                  <option value="amber">Amber</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="skinTone">Skin Tone</label>
                <select
                  id="skinTone"
                  name="skinTone"
                  value={attributes.skinTone}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="white">White</option>
                  <option value="black">Black</option>
                  <option value="mixed">Mixed</option>
                  <option value="brown">Brown</option>
                  <option value="asian">Asian</option>
                  <option value="latino">Latino/Latina</option>
                  <option value="middle-eastern">Middle Eastern</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="bodyType">Body Type</label>
                <select
                  id="bodyType"
                  name="bodyType"
                  value={attributes.bodyType}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="slim">Slim</option>
                  <option value="athletic">Athletic</option>
                  <option value="average">Average</option>
                  <option value="curvy">Curvy</option>
                  <option value="plus-size">Plus Size</option>
                </select>
              </div>
            </div>
          </div>

          <div className="attribute-section">
            <h3>Style & Personality</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="style">Fashion Style</label>
                <select
                  id="style"
                  name="style"
                  value={attributes.style}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="casual">Casual</option>
                  <option value="elegant">Elegant</option>
                  <option value="sporty">Sporty</option>
                  <option value="bohemian">Bohemian</option>
                  <option value="edgy">Edgy</option>
                  <option value="professional">Professional</option>
                  <option value="glamorous">Glamorous</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="personality">Personality</label>
                <input
                  type="text"
                  id="personality"
                  name="personality"
                  value={attributes.personality}
                  onChange={handleChange}
                  placeholder="e.g., Confident, Friendly, Mysterious"
                />
              </div>
            </div>
          </div>

          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={loading}>
              Back
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Next: Generate Images'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModelAttributes;
