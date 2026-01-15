import React, { useState } from 'react';
import './MaintenanceModern.css';

function Maintenance() {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setError('');

    // Check admin credentials
    if (username === 'admin4' && password === 'Kakareko28!') {
      // Set admin session
      sessionStorage.setItem('admin_bypass', 'true');
      // Reload to bypass maintenance mode
      window.location.href = '/';
    } else {
      setError('Invalid admin credentials');
      setPassword('');
    }
  };

  return (
    <div className="maintenance-modern-container">
      <div className="maintenance-modern-wrapper">
        <div className="maintenance-modern-card">
          {/* Icon container */}
          <div className="maintenance-icon-container">
            <div className="maintenance-icon-box">
              <svg
                className="maintenance-icon-svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>

          {/* Headline */}
          <h1 className="maintenance-modern-title">
            Scheduled Maintenance in Progress
          </h1>

          {/* Body text */}
          <p className="maintenance-modern-description">
            We're currently performing important updates to improve Fanova's dashboard, systems, and security. We apologize for any inconvenience and appreciate your patience. We'll be back online shortly with enhanced features and improved performance.
          </p>

          {/* Status badge */}
          <div className="maintenance-badge-container">
            <span className="maintenance-status-badge">
              Status: Dashboard reworks & security improvements
            </span>
          </div>

          {/* Admin login form */}
          {showAdminLogin && (
            <div className="maintenance-admin-section">
              <h3 className="maintenance-admin-title">
                Admin Login
              </h3>
              <form onSubmit={handleAdminLogin} className="maintenance-admin-form">
                <div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    className="maintenance-input"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="maintenance-input"
                  />
                </div>
                {error && (
                  <div className="maintenance-error">
                    {error}
                  </div>
                )}
                <div className="maintenance-button-group">
                  <button
                    type="submit"
                    className="maintenance-btn maintenance-btn-primary"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setUsername('');
                      setPassword('');
                      setError('');
                    }}
                    className="maintenance-btn maintenance-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin access button */}
          {!showAdminLogin && (
            <div className="maintenance-admin-toggle-container">
              <button
                onClick={() => setShowAdminLogin(true)}
                className="maintenance-admin-toggle"
              >
                Admin Access
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Maintenance;
