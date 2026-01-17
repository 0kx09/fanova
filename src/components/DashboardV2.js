import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Sidebar from './SidebarV2';
import './DashboardV2.css';
// Note: You may need to copy logo.png from the other project to src/logo.png
// Or update this path to use an existing logo
// import logo from '../logo.png';

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
        {/* Logo - update path as needed */}
        <div className="mobile-logo-text" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Fanova</div>
        {/* <img src={logo} alt="Fanova" className="mobile-logo" /> */}
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
