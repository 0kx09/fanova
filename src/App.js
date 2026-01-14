import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import ModelInfo from './pages/ModelInfo';
import ModelAttributes from './pages/ModelAttributes';
import GenerationChoice from './pages/GenerationChoice';
import FacialFeatures from './pages/FacialFeatures';
import GenerateResults from './pages/GenerateResults';
import DashboardNew from './pages/DashboardNew';
import ModelView from './pages/ModelView';
import Subscription from './pages/Subscription';
import PaymentSuccess from './pages/PaymentSuccess';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import Maintenance from './pages/Maintenance';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
          <Routes>
            {/* Maintenance page */}
            <Route path="/maintenance" element={<Maintenance />} />

            {/* All other routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/model-info" element={<><Navigation /><ModelInfo /></>} />
            <Route path="/model-attributes" element={<><Navigation /><ModelAttributes /></>} />
            <Route path="/generation-choice" element={<><Navigation /><GenerationChoice /></>} />
            <Route path="/facial-features" element={<><Navigation /><FacialFeatures /></>} />
            <Route path="/generate-results" element={<><Navigation /><GenerateResults /></>} />
            <Route path="/dashboard" element={<DashboardNew />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/model/:modelId" element={<ModelView />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>

          {/* Discord Button */}
          <a
              href="https://discord.gg/fanova"
              target="_blank"
              rel="noopener noreferrer"
              className="discord-button"
            >
              Join Discord
            </a>
      </div>
    </Router>
  );
}

export default App;
