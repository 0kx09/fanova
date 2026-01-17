import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Sidebar from './SidebarV2';
import logo from '../logo.png';
import './DashboardV2.css';

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if user is authenticated
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  // Force light mode - remove dark class and override body styles when dashboard loads
  React.useEffect(() => {
    // Remove dark class from html and body
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    
    // Force body background to white via inline style (highest specificity)
    const originalBodyBg = document.body.style.background;
    const originalBodyColor = document.body.style.color;
    document.body.style.setProperty('background', '#ffffff', 'important');
    document.body.style.setProperty('background-color', '#ffffff', 'important');
    document.body.style.setProperty('color', '#1a1a1a', 'important');
    
    // Also override html background
    const originalHtmlBg = document.documentElement.style.background;
    document.documentElement.style.setProperty('background', '#ffffff', 'important');
    document.documentElement.style.setProperty('background-color', '#ffffff', 'important');
    
    return () => {
      // Optionally restore on unmount (but not needed if other pages handle it)
      // document.body.style.background = originalBodyBg;
      // document.body.style.color = originalBodyColor;
      // document.documentElement.style.background = originalHtmlBg;
    };
  }, []);

  const handleMenuClick = () => {
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const getActivePage = () => {
    const path = location.pathname;
    if (path.includes('/dashboard-v2/models')) return 'Models';
    if (path.includes('/dashboard-v2/free-credits')) return 'Free Credits';
    if (path.includes('/dashboard-v2/usage')) return 'Usage';
    if (path.includes('/dashboard-v2/settings')) return 'Settings';
    return 'Models';
  };

  return (
    <div className="dashboard-container">
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={handleMenuClick}>
          ≡
        </button>
        <img src={logo} alt="Fanova" className="mobile-logo" />
        <div className="mobile-user-avatar">
          <span>U</span>
        </div>
      </div>
      <Sidebar
        activePage={getActivePage()}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
      {isSidebarOpen && <div className="sidebar-overlay" onClick={handleCloseSidebar}></div>}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
