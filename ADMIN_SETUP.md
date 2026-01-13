# Admin Panel Setup Instructions

## Overview

The admin panel provides comprehensive user management and administrative controls for the Fanova platform.

## First Admin Setup

1. **Navigate to Admin Login**: Go to `/admin-login` in your browser

2. **First Admin Credentials**:
   - Email: `admin@fanova.com` (fixed)
   - Password: Enter any password (this will be set as the first admin's password)

3. **First Login**: 
   - On first login, the system will automatically:
     - Create the admin user account if it doesn't exist
     - Set the password you entered
     - Grant `super_admin` role (highest privileges)
     - Redirect you to the admin panel

4. **Subsequent Logins**: Use the password you set during first login

## Database Setup

Run the SQL schema file in Supabase SQL Editor:

```bash
# Run this file in Supabase SQL Editor
server/admin-schema.sql
```

This will:
- Add admin columns to profiles table
- Create admin_actions audit log table
- Set up necessary indexes and RLS policies

## Admin Roles

### Super Admin (First Admin)
- **Highest privileges**
- Can create/remove other admins
- Can delete users
- Can perform all admin actions
- Cannot have super admin status removed

### Admin
- Can manage users (ban, lock, update)
- Can view all user data
- Cannot delete users
- Cannot manage other admins

### Moderator
- Limited privileges (can be customized)
- Typically for viewing and basic actions

## Admin Panel Features

### Users Tab
- **View all users** with pagination
- **Search** by email or user ID
- **Filter** by status (all, active, banned, locked, subscribed)
- **View user details** including:
  - Account information
  - Subscription details
  - Payment history
  - Credit transactions
  - Trial status
  - Next payment date

### User Management Actions
- **Ban User**: Prevents user from accessing the platform
- **Unban User**: Restores user access
- **Lock Account**: Temporarily locks account (can be unlocked)
- **Unlock Account**: Restores locked account
- **Update Credits**: Manually adjust user credits
- **Delete User**: Permanently delete user and all data (super admin only)

### Admins Tab
- View all admin users
- Create new admins (super admin only)
- See admin roles and creation dates

### Statistics Tab
- Total users
- Subscribed users
- Banned users
- Locked users
- Total credits across platform

## API Endpoints

All admin endpoints require authentication and admin privileges:

- `GET /api/admin/users` - List users (with pagination/filters)
- `GET /api/admin/users/:userId` - Get user details
- `POST /api/admin/users/:userId/ban` - Ban user
- `POST /api/admin/users/:userId/unban` - Unban user
- `POST /api/admin/users/:userId/lock` - Lock user
- `POST /api/admin/users/:userId/unlock` - Unlock user
- `POST /api/admin/users/:userId/update` - Update user
- `DELETE /api/admin/users/:userId` - Delete user (super admin only)
- `GET /api/admin/admins` - List admins
- `POST /api/admin/admins` - Create admin (super admin only)
- `GET /api/admin/stats` - Get platform statistics
- `POST /api/admin/check-first-admin` - First admin setup/login

## Security Features

1. **Authentication Required**: All admin routes require valid Supabase session
2. **Role-Based Access**: Different permissions based on admin role
3. **Audit Logging**: All admin actions are logged in `admin_actions` table
4. **IP Tracking**: Admin actions include IP address and user agent
5. **First Admin Protection**: First admin cannot have super admin status removed

## Troubleshooting

### Can't access admin panel
- Verify you're logged in with an admin account
- Check that `is_admin = true` in profiles table
- Ensure admin schema has been run

### First admin not working
- Verify email is exactly `admin@fanova.com`
- Check server logs for errors
- Ensure Supabase service role key is set correctly

### User actions not working
- Check RLS policies allow service role to update profiles
- Verify admin role has required permissions
- Check server logs for specific errors

## Production Checklist

- [ ] Run admin schema SQL in Supabase
- [ ] Set up first admin account
- [ ] Test all admin functions
- [ ] Verify audit logging works
- [ ] Set up proper error monitoring
- [ ] Review RLS policies for security
- [ ] Document admin procedures for team

## Notes

- The first admin (`admin@fanova.com`) is automatically granted `super_admin` role
- Super admin status cannot be removed from the first admin
- All admin actions are logged for audit purposes
- User deletion is permanent and cannot be undone
- Banned/locked users cannot access the platform even with valid credentials
