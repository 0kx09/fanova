import React, { useState, useEffect, useMemo } from 'react';
import { getCreditTransactions } from '../services/supabaseService';
import './UsageV2.css';

function Usage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7'); // days
  const [filter, setFilter] = useState('all'); // all, spend, earned

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getCreditTransactions(100); // Get last 100 transactions
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const periodDays = parseInt(period);
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.created_at);
      return transDate >= periodStart;
    });

    const totalSpent = periodTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalEarned = periodTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const imagesGenerated = periodTransactions
      .filter(t => t.transaction_type === 'generation' && t.amount < 0)
      .length;

    const modelsCount = new Set(
      transactions
        .filter(t => t.transaction_type === 'generation')
        .map(t => t.metadata?.modelId)
        .filter(Boolean)
    ).size;

    return {
      totalSpent,
      totalEarned,
      imagesGenerated,
      modelsCount
    };
  }, [transactions, period]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by type
    if (filter === 'spend') {
      filtered = filtered.filter(t => t.amount < 0);
    } else if (filter === 'earned') {
      filtered = filtered.filter(t => t.amount > 0);
    }

    // Limit to period
    const periodDays = parseInt(period);
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(t => new Date(t.created_at) >= periodStart);

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [transactions, filter, period]);

  // Generate chart data (daily breakdown for period)
  const chartData = useMemo(() => {
    const periodDays = parseInt(period);
    const days = [];
    const now = new Date();
    
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayTransactions = transactions.filter(t => {
        const transDate = new Date(t.created_at);
        return transDate.toDateString() === date.toDateString();
      });
      
      const dayCredits = dayTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      days.push({ day: dateStr, credits: dayCredits });
    }
    
    return days;
  }, [transactions, period]);

  const maxCredits = Math.max(...chartData.map(d => d.credits), 1);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        date: 'Today',
        time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    } else if (diffDays === 1) {
      return {
        date: 'Yesterday',
        time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    } else {
      return {
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    }
  };

  const formatTransactionType = (type, description) => {
    if (description) {
      // Try to extract model name or useful info from description
      const modelMatch = description.match(/Model:?\s*([^,]+)/i);
      if (modelMatch) {
        return `Model: ${modelMatch[1]}`;
      }
    }

    const typeMap = {
      'generation': 'Image Generation',
      'recharge': 'Credit Purchase',
      'subscription': 'Monthly Credits',
      'referral': 'Referral Bonus',
      'refund': 'Refund',
      'admin': 'Admin Adjustment',
      'task': 'Task Reward'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="usage-page">
        <div className="usage-header">
          <h1 className="usage-title">Usage</h1>
          <p className="usage-subheader">Loading usage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="usage-page">
      <div className="usage-header">
        <h1 className="usage-title">Usage</h1>
        <p className="usage-subheader">Track your credit consumption and generation history.</p>
      </div>

      {/* Tier 1: High-Level Stats */}
      <div className="usage-stats-grid">
        <div className="usage-stat-card">
          <div className="stat-header">
            <p className="stat-title">Total Credits Consumed</p>
          </div>
          <p className="stat-value">{stats.totalSpent.toLocaleString()}</p>
          <p className="stat-subtitle">Last {period} days</p>
        </div>
        <div className="usage-stat-card">
          <div className="stat-header">
            <p className="stat-title">Images Generated</p>
          </div>
          <p className="stat-value">{stats.imagesGenerated.toLocaleString()}</p>
          <p className="stat-subtitle">Last {period} days</p>
        </div>
        <div className="usage-stat-card">
          <div className="stat-header">
            <p className="stat-title">Models Trained</p>
          </div>
          <p className="stat-value">{stats.modelsCount}</p>
          <p className="stat-subtitle">Total</p>
        </div>
      </div>

      {/* Tier 2: Chart */}
      <div className="usage-chart-card">
        <div className="chart-header">
          <h2 className="chart-title">Usage Over Time</h2>
          <select 
            className="chart-period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <div className="chart-container">
          <div className="chart-bars">
            {chartData.map((data, index) => (
              <div key={index} className="chart-bar-wrapper">
                <div 
                  className="chart-bar"
                  style={{ height: `${(data.credits / maxCredits) * 100}%` }}
                  title={`${data.day}: ${data.credits} credits`}
                ></div>
                <span className="chart-bar-label">{data.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier 3: Transaction Ledger */}
      <div className="usage-ledger-card">
        <div className="ledger-header">
          <h2 className="ledger-title">Transaction History</h2>
          <select 
            className="ledger-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="spend">Spent</option>
            <option value="earned">Earned</option>
          </select>
        </div>
        <div className="ledger-list">
          {filteredTransactions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              No transactions found
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const dateTime = formatDate(transaction.created_at);
              const isSpend = transaction.amount < 0;
              
              return (
                <div key={transaction.id} className="ledger-item">
                  <div className="ledger-item-left">
                    <div className="ledger-date">
                      <span className="ledger-date-text">{dateTime.date}</span>
                      <span className="ledger-time">{dateTime.time}</span>
                    </div>
                    <div className="ledger-details">
                      <p className="ledger-description">
                        {formatTransactionType(transaction.transaction_type, transaction.description)}
                      </p>
                      <p className="ledger-action">
                        {transaction.description || `Credit ${isSpend ? 'deducted' : 'added'}`}
                      </p>
                    </div>
                  </div>
                  <div className={`ledger-amount ${isSpend ? 'spend' : 'earned'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} Credits
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Usage;
