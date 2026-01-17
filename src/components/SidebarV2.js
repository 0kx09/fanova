import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserProfile } from '../services/supabaseService';
import './SidebarV2.css';

function Sidebar({ activePage, isOpen, onClose }) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [credits, setCredits] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { label: 'Models', path: '/dashboard-v2/models' },
    { label: 'Free Credits', path: '/dashboard-v2/free-credits' },
    { label: 'Usage', path: '/dashboard-v2/usage' },
    { label: 'Settings', path: '/dashboard-v2/settings' }
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  const loadUserData = async () => {
    try {
      // Get user from Supabase auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setUser({
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'
        });

        // Get profile with credits
        try {
          const profile = await getUserProfile();
          setCredits(profile.credits);
        } catch (error) {
          console.error('Error loading profile:', error);
          setCredits(0);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    if (window.toggleTheme) {
      window.toggleTheme();
      setIsDark(!isDark);
    } else {
      // Fallback theme toggle
      document.documentElement.classList.toggle('dark');
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const name = user.name || user.email || 'User';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-text" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1a1a1a' }}>
          Fanova
        </div>
        {/* Uncomment if you have logo.png in src/ */}
        {/* <img src={logo} alt="Fanova" className="sidebar-logo" /> */}
      </div>
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.label} className="sidebar-menu-item">
              <Link
                to={item.path}
                className={`sidebar-link ${activePage === item.label ? 'active' : ''}`}
                onClick={onClose}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-credits">
        <div className="sidebar-credits-label">Credits</div>
        <div className="sidebar-credits-amount">{loading ? '...' : (credits !== null ? credits : 0)}</div>
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            <span>{getUserInitials()}</span>
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{user?.name || 'User'}</div>
            <div className="sidebar-user-email">{user?.email || ''}</div>
          </div>
        </div>
        <div className="sidebar-footer-actions">
          <button 
            className="sidebar-theme-toggle" 
            onClick={handleThemeToggle}
            title="Toggle Dark Mode"
            aria-label="Toggle Dark Mode"
          >
            <svg className="theme-icon theme-icon-sun" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg className="theme-icon theme-icon-moon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
          <button 
            className="sidebar-logout-btn" 
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
