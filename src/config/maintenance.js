/**
 * Maintenance Mode Configuration
 * Set MAINTENANCE_MODE to true to enable maintenance mode
 * Admin users with correct credentials can still access the site
 */

// Enable/disable maintenance mode
export const MAINTENANCE_MODE = false;

// Check if user has admin bypass
export const hasAdminBypass = () => {
  return sessionStorage.getItem('admin_bypass') === 'true';
};

// Clear admin bypass (for logout)
export const clearAdminBypass = () => {
  sessionStorage.removeItem('admin_bypass');
};
