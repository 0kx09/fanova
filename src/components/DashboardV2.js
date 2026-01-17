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
    // Add a class to body/html to indicate dashboard is active
    document.body.classList.add('dashboard-active');
    document.documentElement.classList.add('dashboard-active');
    
    // Remove dark class from html and body
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    
    // Force body background to white via inline style (highest specificity)
    document.body.style.setProperty('background', '#ffffff', 'important');
    document.body.style.setProperty('background-color', '#ffffff', 'important');
    document.body.style.setProperty('color', '#1a1a1a', 'important');
    
    // Also override html background
    document.documentElement.style.setProperty('background', '#ffffff', 'important');
    document.documentElement.style.setProperty('background-color', '#ffffff', 'important');
    
    // Force override on #root as well
    const root = document.getElementById('root');
    if (root) {
      root.style.setProperty('background', '#ffffff', 'important');
      root.style.setProperty('background-color', '#ffffff', 'important');
    }
    
    return () => {
      // Clean up on unmount
      document.body.classList.remove('dashboard-active');
      document.documentElement.classList.remove('dashboard-active');
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
