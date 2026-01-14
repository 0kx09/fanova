import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleLearnMore = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">✨</span>
            <span className="logo-text">Fanova</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <button className="nav-btn-secondary" onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button className="nav-btn-primary" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-headline">
              Create AI Models That Feel Personal.
            </h1>
            <p className="hero-subheadline">
              Train custom AI image models using reference photos or detailed descriptions.
              Generate realistic, consistent images in seconds.
            </p>
            <div className="hero-cta">
              <button className="btn-primary-large" onClick={handleGetStarted}>
                Create Your Model
              </button>
              <button className="btn-secondary-large" onClick={handleLearnMore}>
                See How It Works
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <img 
                src="/dashboard.png" 
                alt="Fanova Dashboard Preview" 
                className="dashboard-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-section">
        <div className="section-container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Create your custom AI model in four simple steps</p>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="step-title">Upload or Describe</h3>
              <p className="step-description">
                Upload reference images or describe the look, style, and attributes of your model.
              </p>
            </div>

            <div className="step-card">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="step-title">Train Your Model</h3>
              <p className="step-description">
                Fanova creates a personalized AI model tuned to your inputs.
              </p>
            </div>

            <div className="step-card">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="step-title">Generate Images</h3>
              <p className="step-description">
                Create high-quality images on demand using credits.
              </p>
            </div>

            <div className="step-card">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v6m0 6v6M1 12h6m6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M4.2 4.2l4.3 4.3m7 7l4.3 4.3M4.2 19.8l4.3-4.3m7-7l4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="step-title">Control & Customize</h3>
              <p className="step-description">
                Adjust prompts, styles, and outputs anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features-section">
        <div className="section-container">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">Everything you need to create stunning AI-generated images</p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3 className="feature-title">Custom AI Model Creation</h3>
              <p className="feature-description">Build unique models tailored to your exact specifications</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3 className="feature-title">Reference Image Training</h3>
              <p className="feature-description">Train models using your own reference photos</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚙️</div>
              <h3 className="feature-title">Attribute-Based Customization</h3>
              <p className="feature-description">Fine-tune every detail from facial features to style</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Fast Image Generation</h3>
              <p className="feature-description">Generate high-quality images in seconds</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3 className="feature-title">Credit-Based System</h3>
              <p className="feature-description">Pay only for what you use with flexible credits</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Private & Secure</h3>
              <p className="feature-description">Your models and data stay completely private</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">✨</div>
              <h3 className="feature-title">No Watermarks</h3>
              <p className="feature-description">Clean images on paid plans without branding</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">24/7 Support</h3>
              <p className="feature-description">Priority assistance available on higher tiers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing-section">
        <div className="section-container">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Choose the plan that fits your needs</p>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-tier">Base Plan</h3>
                <div className="pricing-price">
                  <span className="price-currency">£</span>
                  <span className="price-amount">9.99</span>
                  <span className="price-period">/month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>50 credits per month</li>
                <li>Watermarked images</li>
                <li>Custom AI models</li>
                <li>Email support</li>
              </ul>
              <button className="pricing-btn" onClick={handleGetStarted}>
                Get Started
              </button>
            </div>

            <div className="pricing-card featured">
              <div className="featured-badge">Most Popular</div>
              <div className="pricing-header">
                <h3 className="pricing-tier">Essential Plan</h3>
                <div className="pricing-price">
                  <span className="price-currency">£</span>
                  <span className="price-amount">19.99</span>
                  <span className="price-period">/month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>250 credits per month</li>
                <li>No watermarks</li>
                <li>Custom AI models</li>
                <li>24/7 support</li>
                <li>Priority generation</li>
              </ul>
              <button className="pricing-btn-primary" onClick={handleGetStarted}>
                Get Started
              </button>
            </div>

            <div className="pricing-card">
              <div className="pricing-trial-badge">1 Day Free Trial</div>
              <div className="pricing-header">
                <h3 className="pricing-tier">Ultimate Plan</h3>
                <div className="pricing-trial-notice">
                  <span>Start with 1 day free trial</span>
                </div>
                <div className="pricing-price">
                  <span className="price-currency">£</span>
                  <span className="price-amount">29.99</span>
                  <span className="price-period">/month</span>
                </div>
                <div className="pricing-after-trial">
                  <span>Then £29.99/month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>500 credits per month</li>
                <li>No watermarks</li>
                <li>Custom AI models</li>
                <li>Priority support</li>
                <li>Lower credit cost</li>
                <li>Advanced features</li>
                <li>1 day free trial</li>
              </ul>
              <button className="pricing-btn" onClick={handleGetStarted}>
                Start Free Trial
              </button>
            </div>
          </div>

          <div className="pricing-note">
            <p>All plans include monthly credit allocations. <strong>Unused credits roll over</strong> to the next month.</p>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="trust-section">
        <div className="section-container">
          <h2 className="section-title">Private & Secure</h2>
          <p className="section-subtitle">Your data and models are protected</p>

          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon">🔐</div>
              <h3>Private Model Training</h3>
              <p>Your custom models are trained privately and never shared</p>
            </div>

            <div className="trust-item">
              <div className="trust-icon">🛡️</div>
              <h3>User Data Protection</h3>
              <p>Enterprise-grade security for all your data and images</p>
            </div>

            <div className="trust-item">
              <div className="trust-icon">📋</div>
              <h3>Clear Guidelines</h3>
              <p>Transparent content policies and usage guidelines</p>
            </div>

            <div className="trust-item">
              <div className="trust-icon">🔒</div>
              <h3>No Public Sharing</h3>
              <p>Your content stays private unless you choose to share it</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof-section">
        <div className="section-container">
          <div className="proof-content">
            <h2 className="proof-headline">Built for Creators</h2>
            <p className="proof-text">
              Early access users are generating thousands of images with Fanova's
              custom AI models. Join a growing community of creators.
            </p>
            <div className="proof-stats">
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Images Generated</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Custom Models</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">98%</div>
                <div className="stat-label">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <div className="section-container">
          <div className="final-cta-content">
            <h2 className="final-cta-headline">Build Your AI Model Today.</h2>
            <p className="final-cta-text">
              Start creating personalized AI-generated images in minutes
            </p>
            <button className="btn-final-cta" onClick={handleGetStarted}>
              Get Started Free
            </button>
            <p className="final-cta-note">No credit card required to explore</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-icon">✨</span>
              <span className="logo-text">Fanova</span>
            </div>
            <p className="footer-tagline">Create AI models that feel personal</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how-it-works">How It Works</a>
            </div>

            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#faq">FAQ</a>
            </div>

            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#terms">Terms of Service</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#guidelines">Content Guidelines</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 Fanova. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
