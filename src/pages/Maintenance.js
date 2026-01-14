import React, { useState } from 'react';
import './Maintenance.css';

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
    <div className="maintenance-container">
      <div className="maintenance-content">
        <div className="maintenance-icon">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        <h1>We'll be back soon!</h1>

        <p className="maintenance-message">
          We're currently performing scheduled maintenance to improve your experience.
          We apologize for any inconvenience and appreciate your patience.
        </p>

        <p className="maintenance-submessage">
          Expected completion: Shortly
        </p>

        {!showAdminLogin ? (
          <button
            className="admin-toggle-btn"
            onClick={() => setShowAdminLogin(true)}
          >
            Admin Access
          </button>
        ) : (
          <div className="admin-login-form">
            <h3>Admin Login</h3>
            <form onSubmit={handleAdminLogin}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions">
                <button type="submit" className="login-btn">
                  Login
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setUsername('');
                    setPassword('');
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Maintenance;
