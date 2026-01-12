# Credits System Documentation

## Overview
The credits system is fully implemented and ready to use. Users start with 10 free credits and credits are deducted when generating images.

## Database Schema

### Profiles Table
Located in `public.profiles`:
- `id` - UUID (references auth.users)
- `email` - TEXT
- `credits` - INTEGER (default: 10)
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### Auto-creation Trigger
When a new user signs up via Supabase Auth, a trigger automatically creates a profile with 10 starting credits.

## How It Works

### 1. New User Signup
```sql
-- Trigger: on_auth_user_created
-- Function: handle_new_user()
-- Action: Creates profile with 10 credits
```

### 2. Checking Credits
```javascript
import { getUserCredits } from './services/supabaseService';
const credits = await getUserCredits();
```

### 3. Deducting Credits
```javascript
import { deductCredits } from './services/supabaseService';
const newCredits = await deductCredits(3); // Deduct 3 credits for image generation
```

### 4. Updating Credits
```javascript
import { updateUserCredits } from './services/supabaseService';
await updateUserCredits(50); // Set credits to 50
```

## Integration Points

### Dashboard
File: `src/pages/DashboardNew.js`
- Displays current credit balance in sidebar
- Updates via `getUserCredits()` on component mount

### Image Generation
To integrate credit deduction:
1. Check credits before generation
2. Deduct credits after successful generation
3. Update UI to show new balance

Example:
```javascript
const credits = await getUserCredits();
if (credits < 3) {
  alert('Insufficient credits');
  return;
}

// Generate images...
const newCredits = await deductCredits(3);
setCredits(newCredits);
```

## Setup Instructions

### Run the Schema
Execute the SQL schema in your Supabase dashboard:
```bash
# Copy contents of server/supabase-schema.sql
# Paste into Supabase SQL Editor
# Run the query
```

### Verify Setup
1. Check that `profiles` table exists
2. Verify trigger `on_auth_user_created` exists
3. Test by creating a new user - should auto-create profile with 10 credits

## RLS (Row Level Security)
All tables have RLS enabled:
- Users can only view/update their own profile
- Users can only view/modify their own models and images

## Credit Pricing (Future)
The current system supports:
- Free tier: 10 credits on signup
- Paid plans: Update credits via admin panel or Stripe webhook
- Credit packs: Add to existing credits balance

## Files Modified
- `server/supabase-schema.sql` - Database schema
- `src/services/supabaseService.js` - Credit functions
- `src/pages/DashboardNew.js` - UI display
