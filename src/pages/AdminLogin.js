import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkFirstAdmin } from '../services/adminService';
import './AdminLogin.css';

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: 'admin@fanova.com',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.email !== 'admin@fanova.com') {
        setError('Invalid admin email. Use admin@fanova.com');
        setLoading(false);
        return;
      }

      if (!formData.password) {
        setError('Password is required');
        setLoading(false);
        return;
      }

      const result = await checkFirstAdmin(formData.email, formData.password);
      
      if (result.isFirstAdmin) {
        setIsFirstAdmin(true);
        // Show success message and redirect
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } else {
        // Regular admin login
        navigate('/admin');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1 className="logo">Fanova</h1>
          <h2>Admin Panel</h2>
          <p className="subtitle">Administrator Access</p>
        </div>

        {isFirstAdmin && (
          <div className="success-banner">
            ✅ First admin account created successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading || isFirstAdmin}
              placeholder="admin@fanova.com"
              readOnly
            />
            <small className="form-hint">
              {isFirstAdmin 
                ? 'First admin account created. Password has been set.'
                : 'Enter your password to login or set initial password for first admin.'
              }
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              {isFirstAdmin ? 'Password Set' : 'Password'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading || isFirstAdmin}
              placeholder={isFirstAdmin ? 'Password has been set' : 'Enter password'}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || isFirstAdmin}
          >
            {loading 
              ? 'Processing...' 
              : isFirstAdmin 
                ? 'Redirecting...' 
                : 'Sign In'
            }
          </button>
        </form>

        <div className="admin-login-footer">
          <p>First time setup: Enter any password to create the first admin account.</p>
          <p>Subsequent logins: Use the password you set.</p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
