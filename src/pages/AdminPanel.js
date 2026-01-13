import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  getUsers, 
  getUserDetails, 
  banUser, 
  unbanUser, 
  lockUser, 
  unlockUser, 
  deleteUser, 
  updateUser,
  getAdmins,
  createAdmin,
  getAdminStats
} from '../services/adminService';
import './AdminPanel.css';

function AdminPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, currentPage, search, statusFilter, activeTab]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin-login');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, admin_role')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.is_admin) {
        navigate('/admin-login');
        return;
      }

      setCurrentUser({ ...user, admin_role: profile.admin_role });
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/admin-login');
    }
  };

  const loadData = async () => {
    try {
      if (activeTab === 'users') {
        const usersData = await getUsers(currentPage, 50, search, statusFilter);
        setUsers(usersData.users || []);
        setTotalPages(usersData.pagination?.totalPages || 1);
      } else if (activeTab === 'admins') {
        const adminsData = await getAdmins();
        setAdmins(adminsData.admins || []);
      } else if (activeTab === 'stats') {
        const statsData = await getAdminStats();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      window.alert(error.message);
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const details = await getUserDetails(userId);
      setUserDetails(details);
      setSelectedUser(userId);
      setShowUserModal(true);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleBanUser = async (userId, reason = '') => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    try {
      await banUser(userId, reason || 'No reason provided');
      loadData();
      if (selectedUser === userId) {
        handleViewUser(userId);
      }
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await unbanUser(userId);
      loadData();
      if (selectedUser === userId) {
        handleViewUser(userId);
      }
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleLockUser = async (userId, reason = '') => {
    if (!window.confirm('Are you sure you want to lock this user account?')) return;
    try {
      await lockUser(userId, reason || 'No reason provided');
      loadData();
      if (selectedUser === userId) {
        handleViewUser(userId);
      }
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await unlockUser(userId);
      loadData();
      if (selectedUser === userId) {
        handleViewUser(userId);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete the user and all their data. This cannot be undone. Are you absolutely sure?')) return;
    if (!window.confirm('This is your last chance. Delete user?')) return;
    try {
      await deleteUser(userId);
      window.alert('User deleted successfully');
      loadData();
      setShowUserModal(false);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await updateUser(userId, updates);
      window.alert('User updated successfully');
      loadData();
      if (selectedUser === userId) {
        handleViewUser(userId);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail) {
      window.alert('Email is required');
      return;
    }
    try {
      await createAdmin(newAdminEmail, newAdminRole);
      window.alert('Admin created successfully');
      setShowAdminModal(false);
      setNewAdminEmail('');
      setNewAdminRole('admin');
      loadData();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount, currency = 'gbp') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="admin-panel-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Panel</h1>
          <div className="admin-header-actions">
            <span className="admin-role-badge">{currentUser?.admin_role || 'admin'}</span>
            <button className="btn-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={activeTab === 'admins' ? 'active' : ''}
          onClick={() => setActiveTab('admins')}
        >
          Admins
        </button>
        <button 
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="users-filters">
              <input
                type="text"
                placeholder="Search by email or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="locked">Locked</option>
                <option value="subscribed">Subscribed</option>
              </select>
            </div>

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Credits</th>
                    <th>Trial</th>
                    <th>Next Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className={user.is_banned ? 'banned' : user.is_locked ? 'locked' : ''}>
                      <td>{user.email}</td>
                      <td>
                        {user.is_banned && <span className="badge badge-banned">Banned</span>}
                        {user.is_locked && <span className="badge badge-locked">Locked</span>}
                        {!user.is_banned && !user.is_locked && <span className="badge badge-active">Active</span>}
                      </td>
                      <td>{user.subscription_plan || 'None'}</td>
                      <td>{user.credits || 0}</td>
                      <td>{user.isTrialing ? 'Yes' : 'No'}</td>
                      <td>{user.nextPaymentDate ? formatDate(user.nextPaymentDate) : 'N/A'}</td>
                      <td>
                        <button 
                          className="btn-small btn-primary"
                          onClick={() => handleViewUser(user.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="admins-tab">
            {currentUser?.admin_role === 'super_admin' && (
              <div className="admins-header">
                <button 
                  className="btn-primary"
                  onClick={() => setShowAdminModal(true)}
                >
                  + Add Admin
                </button>
              </div>
            )}

            <div className="admins-list">
              {admins.map((admin) => (
                <div key={admin.id} className="admin-card">
                  <div className="admin-card-info">
                    <h3>{admin.email}</h3>
                    <span className={`admin-role-badge ${admin.admin_role}`}>
                      {admin.admin_role || 'admin'}
                    </span>
                  </div>
                  <div className="admin-card-meta">
                    <small>Created: {formatDate(admin.created_at)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="stats-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-value">{stats.totalUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Subscribed Users</h3>
                <p className="stat-value">{stats.subscribedUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Banned Users</h3>
                <p className="stat-value">{stats.bannedUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Locked Users</h3>
                <p className="stat-value">{stats.lockedUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Total Credits</h3>
                <p className="stat-value">{stats.totalCredits.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && userDetails && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details: {userDetails.profile.email}</h2>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="user-details-section">
                <h3>Account Information</h3>
                <div className="detail-grid">
                  <div><strong>Email:</strong> {userDetails.profile.email}</div>
                  <div><strong>User ID:</strong> {userDetails.profile.id}</div>
                  <div><strong>Credits:</strong> {userDetails.profile.credits || 0}</div>
                  <div><strong>Plan:</strong> {userDetails.profile.subscription_plan || 'None'}</div>
                  <div><strong>Status:</strong> 
                    {userDetails.profile.is_banned && <span className="badge badge-banned">Banned</span>}
                    {userDetails.profile.is_locked && <span className="badge badge-locked">Locked</span>}
                    {!userDetails.profile.is_banned && !userDetails.profile.is_locked && <span className="badge badge-active">Active</span>}
                  </div>
                </div>
              </div>

              {userDetails.profile.subscription_plan && (
                <div className="user-details-section">
                  <h3>Subscription Details</h3>
                  <div className="detail-grid">
                    <div><strong>Plan:</strong> {userDetails.profile.subscription_plan}</div>
                    <div><strong>Start Date:</strong> {formatDate(userDetails.profile.subscription_start_date)}</div>
                    <div><strong>Renewal Date:</strong> {formatDate(userDetails.profile.subscription_renewal_date)}</div>
                    <div><strong>Monthly Credits:</strong> {userDetails.profile.monthly_credits_allocated || 0}</div>
                    {userDetails.stripeSubscription && (
                      <>
                        <div><strong>Stripe Status:</strong> {userDetails.stripeSubscription.status}</div>
                        {userDetails.stripeSubscription.trial_end && (
                          <div><strong>Trial Ends:</strong> {formatDate(new Date(userDetails.stripeSubscription.trial_end * 1000).toISOString())}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {userDetails.paymentHistory && userDetails.paymentHistory.length > 0 && (
                <div className="user-details-section">
                  <h3>Payment History</h3>
                  <div className="payment-history">
                    {userDetails.paymentHistory.map((payment, idx) => (
                      <div key={idx} className="payment-item">
                        <div><strong>{formatCurrency(payment.amount, payment.currency)}</strong></div>
                        <div>{formatDate(payment.date)}</div>
                        <div>{payment.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="user-details-section">
                <h3>Actions</h3>
                <div className="action-buttons">
                  {userDetails.profile.is_banned ? (
                    <button className="btn-secondary" onClick={() => handleUnbanUser(userDetails.profile.id)}>
                      Unban User
                    </button>
                  ) : (
                    <button className="btn-danger" onClick={() => handleBanUser(userDetails.profile.id, window.prompt('Ban reason (optional):'))}>
                      Ban User
                    </button>
                  )}
                  
                  {userDetails.profile.is_locked ? (
                    <button className="btn-secondary" onClick={() => handleUnlockUser(userDetails.profile.id)}>
                      Unlock Account
                    </button>
                  ) : (
                    <button className="btn-warning" onClick={() => handleLockUser(userDetails.profile.id, window.prompt('Lock reason (optional):'))}>
                      Lock Account
                    </button>
                  )}

                  <button 
                    className="btn-primary"
                    onClick={() => {
                      const credits = window.prompt('Enter new credit amount:', userDetails.profile.credits);
                      if (credits !== null) {
                        handleUpdateUser(userDetails.profile.id, { credits: parseInt(credits) });
                      }
                    }}
                  >
                    Update Credits
                  </button>

                  {currentUser?.admin_role === 'super_admin' && (
                    <button 
                      className="btn-danger"
                      onClick={() => handleDeleteUser(userDetails.profile.id)}
                    >
                      Delete User
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Admin</h2>
              <button className="modal-close" onClick={() => setShowAdminModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>

              <div className="form-group">
                <label>Admin Role</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  {currentUser?.admin_role === 'super_admin' && (
                    <option value="super_admin">Super Admin</option>
                  )}
                </select>
              </div>

              <button className="btn-primary" onClick={handleCreateAdmin}>
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
