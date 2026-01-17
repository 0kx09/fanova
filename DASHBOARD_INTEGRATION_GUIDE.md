# Dashboard Integration Guide

This guide will help you safely integrate your new dashboard from another project folder into the Fanova codebase without breaking existing functionality.

## 📋 Pre-Integration Checklist

### Step 1: Backup Current Files
**IMPORTANT:** Before making any changes, back up your current dashboard files:

```bash
# On your Linux server or locally
cp src/pages/DashboardNew.js src/pages/DashboardNew.js.backup
cp src/pages/DashboardNew.css src/pages/DashboardNew.css.backup
```

### Step 2: Identify New Dashboard Files
From your other project folder, identify these files:
- Dashboard component file (likely `Dashboard.js` or similar)
- Dashboard CSS file
- Any new components related to:
  - Free credits display
  - Usage/viewing statistics
  - Any other new features

## 🔍 Features to Preserve

When integrating, **DO NOT MODIFY** these existing features:

### Model Creation Logic (MUST PRESERVE)
- Model navigation flow: `/model-info` → `/model-attributes` → `/generation-choice` → `/facial-features` → `/generate-results`
- Functions in `src/services/supabaseService.js`:
  - `createModel()`
  - `updateModelAttributes()`
  - `updateModelFacialFeatures()`
  - `generateImages()`
- All routes in `src/App.js` related to model creation

### Existing Services (MUST PRESERVE)
- `src/services/supabaseService.js` - All database operations
- `src/services/imageGenerationService.js` - Image generation logic
- `src/services/authService.js` - Authentication
- `src/services/pricingService.js` - Subscription plans

### Current Dashboard Routes
- `/dashboard` - Currently uses `DashboardNew` component
- `/model/:modelId` - Model view page
- `/subscription` - Subscription management

## ✅ New Features to Add

### 1. Free Credits Display
Your new dashboard likely has a better free credits display. Ensure it:
- Uses `getUserProfile()` from `src/services/supabaseService.js`
- Displays `profile.credits` correctly
- Shows subscription plan status (`profile.subscription_plan`)

### 2. Usage Viewing
To add usage viewing, use the existing service:

```javascript
import { getCreditTransactions } from '../services/supabaseService';

// In your dashboard component
const [usageHistory, setUsageHistory] = useState([]);

useEffect(() => {
  const loadUsage = async () => {
    try {
      const transactions = await getCreditTransactions(50); // Last 50 transactions
      setUsageHistory(transactions);
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };
  loadUsage();
}, []);
```

Available transaction types:
- `generation` - Image generation
- `recharge` - Credit purchase
- `subscription` - Monthly allocation
- `referral` - Referral bonus
- `refund` - Refunds

## 📁 File Structure

Your current structure:
```
src/
├── pages/
│   ├── DashboardNew.js    ← Currently used dashboard
│   ├── DashboardNew.css
│   ├── Dashboard.js       ← Old dashboard (not used)
│   └── Dashboard.css
├── services/
│   ├── supabaseService.js ← Has getCreditTransactions()
│   ├── imageGenerationService.js
│   └── authService.js
└── App.js                 ← Routes here
```

## 🔧 Integration Steps

### Option A: Replace DashboardNew (Recommended)
If your new dashboard is a complete replacement:

1. **Copy new dashboard files:**
   ```bash
   # From your other project
   cp /path/to/new/project/src/pages/Dashboard.js src/pages/DashboardNew.js
   cp /path/to/new/project/src/pages/Dashboard.css src/pages/DashboardNew.css
   ```

2. **Update imports:**
   - Ensure the new dashboard imports from:
     - `../lib/supabase` (for Supabase client)
     - `../services/supabaseService` (for database operations)
     - `../services/pricingService` (for plan details)

3. **Verify routing:**
   - Check `src/App.js` - route `/dashboard` should still point to `DashboardNew`

4. **Test navigation:**
   - "Create New Model" button should navigate to `/model-info`
   - Model cards should navigate to `/model/:modelId`
   - Settings should work correctly

### Option B: Merge Features
If you want to add features to the existing dashboard:

1. **Open both dashboards side-by-side**

2. **Copy new features:**
   - Free credits display component
   - Usage viewing component
   - Any new UI elements

3. **Integrate into DashboardNew.js:**
   - Add new state variables
   - Add new useEffect hooks for fetching usage
   - Add new UI sections
   - Preserve existing model list and navigation

## 🧪 Testing Checklist

After integration, test these:

- [ ] Dashboard loads without errors
- [ ] Credits display correctly
- [ ] Usage/transaction history displays correctly
- [ ] "Create New Model" button works
- [ ] Clicking on a model card navigates correctly
- [ ] Settings page accessible
- [ ] Subscription page accessible
- [ ] Logout works
- [ ] Model creation flow still works end-to-end
- [ ] Credit transactions are logged correctly

## 🐛 Common Issues & Fixes

### Issue: "getCreditTransactions is not defined"
**Fix:** Import it:
```javascript
import { getCreditTransactions, getUserProfile } from '../services/supabaseService';
```

### Issue: Credits not displaying
**Fix:** Check if `getUserProfile()` is being called and the response is handled correctly:
```javascript
const profile = await getUserProfile();
setCredits(profile.credits); // Not profile.credit or profile.credit_amount
```

### Issue: Usage history empty
**Fix:** Check if `credit_transactions` table exists in Supabase and has data. Also verify RLS policies allow user to read their own transactions.

### Issue: Model creation broken
**Fix:** Ensure navigation functions are preserved:
```javascript
const handleCreateNew = () => {
  localStorage.removeItem('currentModelId');
  localStorage.removeItem('modelInfo');
  localStorage.removeItem('modelAttributes');
  localStorage.removeItem('facialFeatures');
  navigate('/model-info');
};
```

## 📝 Service Methods Available

You can use these from `src/services/supabaseService.js`:

```javascript
// Get user profile with credits
const profile = await getUserProfile();
// Returns: { credits, subscription_plan, subscription_start_date, ... }

// Get credit transaction history
const transactions = await getCreditTransactions(50);
// Returns: Array of { id, user_id, amount, transaction_type, description, created_at, ... }

// Get subscription history
const subscriptions = await getSubscriptionHistory(20);
// Returns: Array of { id, user_id, plan_type, action, amount_paid, credits_allocated, ... }

// Get all user models
const models = await getUserModels();
// Returns: Array of model objects with generated_images

// Get single model
const model = await getModelById(modelId);
```

## 🚀 Quick Integration Template

If you want to quickly add usage viewing to the existing dashboard, here's a template:

```javascript
// Add to DashboardNew.js

// 1. Import the service
import { getCreditTransactions } from '../services/supabaseService';

// 2. Add state
const [usageHistory, setUsageHistory] = useState([]);
const [showUsage, setShowUsage] = useState(false);

// 3. Add useEffect to load usage
useEffect(() => {
  if (showUsage) {
    const loadUsage = async () => {
      try {
        const transactions = await getCreditTransactions(50);
        setUsageHistory(transactions);
      } catch (error) {
        console.error('Error loading usage:', error);
      }
    };
    loadUsage();
  }
}, [showUsage]);

// 4. Add UI button/tab to show usage
// 5. Add UI to display usageHistory array
```

## 📞 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify all imports are correct
3. Check Supabase RLS policies
4. Compare with backup files if something breaks
5. Test incrementally (add one feature at a time)

## 🔄 Rollback Plan

If something breaks, restore from backup:
```bash
cp src/pages/DashboardNew.js.backup src/pages/DashboardNew.js
cp src/pages/DashboardNew.css.backup src/pages/DashboardNew.css
```

Then restart your server:
```bash
pm2 restart fanova-backend
# Or locally: npm start
```
