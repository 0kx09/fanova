import React, { useState, useEffect } from 'react';
import { getMyReferralLink } from '../services/referralService';
import './FreeCreditsV2.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function FreeCredits() {
  const [referralLink, setReferralLink] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimedTasks, setClaimedTasks] = useState(() => {
    // Load claimed tasks from localStorage
    const stored = localStorage.getItem('claimedTasks');
    return stored ? JSON.parse(stored) : {};
  });

  const socialTasks = [
    {
      id: 'discord',
      name: 'Join Discord',
      description: 'Join our community of creators',
      credits: 50,
      icon: '💬',
      url: 'https://discord.gg/fanova'
    },
    {
      id: 'twitter',
      name: 'Follow on X',
      description: 'Get the latest updates',
      credits: 50,
      icon: '𝕏',
      url: 'https://x.com/fanova' // Update with actual X/Twitter URL
    },
    {
      id: 'rate',
      name: 'Rate Us',
      description: 'Share your feedback',
      credits: 50,
      icon: '⭐',
      url: '#' // Update with actual rating URL
    }
  ];

  useEffect(() => {
    loadReferralLink();
  }, []);

  const loadReferralLink = async () => {
    try {
      setLoading(true);
      const data = await getMyReferralLink();
      setReferralLink(data.referralLink || '');
    } catch (error) {
      console.error('Error loading referral link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    }
  };

  const handleClaim = async (taskId) => {
    if (claimedTasks[taskId]) {
      return; // Already claimed
    }

    try {
      // Call backend to claim task
      const response = await fetch(`${API_BASE_URL}/tasks/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim task');
      }

      const result = await response.json();
      
      // Mark as claimed in localStorage
      const newClaimedTasks = { ...claimedTasks, [taskId]: true };
      setClaimedTasks(newClaimedTasks);
      localStorage.setItem('claimedTasks', JSON.stringify(newClaimedTasks));

      alert(`Success! You've earned ${socialTasks.find(t => t.id === taskId)?.credits || 50} credits!`);
    } catch (error) {
      console.error('Error claiming task:', error);
      // For now, just mark as claimed locally (backend endpoint may not exist yet)
      // In production, remove this fallback once backend is ready
      const newClaimedTasks = { ...claimedTasks, [taskId]: true };
      setClaimedTasks(newClaimedTasks);
      localStorage.setItem('claimedTasks', JSON.stringify(newClaimedTasks));
      alert(`Task completed! (Credits will be added once backend endpoint is ready)`);
    }
  };

  const handleTaskClick = (task) => {
    if (task.url && task.url !== '#') {
      window.open(task.url, '_blank');
      // Auto-claim after opening (with a delay to allow user to complete task)
      setTimeout(() => {
        if (!claimedTasks[task.id]) {
          const shouldClaim = window.confirm(`Did you complete the ${task.name} task?`);
          if (shouldClaim) {
            handleClaim(task.id);
          }
        }
      }, 2000);
    } else {
      handleClaim(task.id);
    }
  };

  return (
    <div className="free-credits-page">
      <div className="credits-header">
        <h1 className="credits-title">Earn Credits</h1>
        <p className="credits-subheader">Complete tasks to run more models.</p>
      </div>

      <div className="credits-referral-card">
        <div className="referral-content">
          <div className="referral-header">
            <span className="referral-badge">Best Value</span>
            <h2 className="referral-title">Refer a Friend</h2>
          </div>
          <p className="referral-description">
            Share your link. You get <span className="referral-highlight">500 credits</span> when they sign up.
          </p>
          <div className="referral-input-group">
            <code className="referral-link">
              {loading ? 'Loading...' : (referralLink || 'No referral link available')}
            </code>
            <button 
              className={`referral-copy-btn ${isLinkCopied ? 'copied' : ''}`}
              onClick={handleCopyLink}
              disabled={!referralLink || loading}
            >
              {isLinkCopied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="credits-tasks-grid">
        {socialTasks.map((task) => {
          const isClaimed = claimedTasks[task.id] || false;
          return (
            <div key={task.id} className="credits-task-card">
              <div className="task-icon">{task.icon}</div>
              <h3 className="task-name">{task.name}</h3>
              <p className="task-description">{task.description}</p>
              <button 
                className={`task-claim-btn ${isClaimed ? 'claimed' : ''}`}
                onClick={() => handleTaskClick(task)}
                disabled={isClaimed}
              >
                {isClaimed ? '✓ Claimed' : `+${task.credits} Credits`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FreeCredits;
