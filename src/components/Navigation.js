import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Navigation.css';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Don't show nav on register/login pages
  const hideNav = location.pathname === '/register' || location.pathname === '/login';

  if (hideNav || !isAuthenticated) {
    return null;
  }

  return (
    <nav className="top-navigation">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/dashboard')}>
          <span className="brand-icon">✨</span>
          <span className="brand-name">Fanova</span>
        </div>

        <div className="nav-actions">
          <button
            className="nav-btn dashboard-btn"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          <button
            className="nav-btn create-btn"
            onClick={() => navigate('/model-info')}
          >
            + Create Model
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
