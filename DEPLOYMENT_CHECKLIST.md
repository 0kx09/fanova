# Deployment Checklist - New Model Generation System

## 📋 Pre-Deployment Steps

### 1. Install OpenAI Package
```bash
cd /var/www/fanova/server
npm install openai
```

### 2. Add OpenAI API Key
```bash
# Edit your .env file
nano /var/www/fanova/server/.env

# Add this line:
OPENAI_API_KEY=sk-proj-YOUR_API_KEY_HERE

# Optional: Specify which model to use (defaults to gpt-5)
OPENAI_VISION_MODEL=gpt-5  # or gpt-4o if gpt-5 not available yet
OPENAI_CHAT_MODEL=gpt-5    # or gpt-4o if gpt-5 not available yet
```

Get your API key from: https://platform.openai.com/api-keys

**IMPORTANT:**
- OpenAI (GPT-5) is used ONLY for analyzing images and creating prompts
- Google Gemini API generates the actual images (already configured)
- You need BOTH APIs for the system to work

### 3. Run Database Migrations
```bash
# Option 1: Via psql
psql -h <supabase-host> -U postgres -d postgres -f /var/www/fanova/server/migrations/add-ai-analysis-fields.sql
psql -h <supabase-host> -U postgres -d postgres -f /var/www/fanova/server/migrations/add-atomic-credit-deduction.sql
psql -h <supabase-host> -U postgres -d postgres -f /var/www/fanova/server/migrations/add-locked-reference-image.sql

# Option 2: Via Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of server/migrations/add-ai-analysis-fields.sql
# 3. Execute
# 4. Copy contents of server/migrations/add-atomic-credit-deduction.sql
# 5. Execute
# 6. Copy contents of server/migrations/add-locked-reference-image.sql
# 7. Execute
```

---

## 🚀 Deployment Steps

### 1. Build Frontend
```bash
cd /var/www/fanova
npm run build
```

### 2. Restart Backend
```bash
# If using PM2
pm2 restart fanova-backend

# If using systemd
sudo systemctl restart fanova-backend

# Check logs
pm2 logs fanova-backend
```

### 3. Verify Deployment
```bash
# Check backend health
curl http://localhost:5000/health

# Should return:
# {"status":"ok","message":"Fanova API is running (NO DATABASE MODE)"}
```

---

## ✅ Post-Deployment Verification

### Test 1: Check OpenAI Integration
```bash
# Test the AI analysis endpoint
curl -X POST http://localhost:5000/api/ai/analyze-reference-images \
  -H "Content-Type: application/json" \
  -d '{"images":["data:image/png;base64,iVBORw0KG...","data:image/png;base64,iVBORw0KG...","data:image/png;base64,iVBORw0KG..."],"modelName":"Test"}'

# Should return analysis results (not an error)
```

### Test 2: Check Database Schema
```sql
-- Connect to database and run:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'models'
AND column_name IN ('ai_analysis', 'merged_prompt', 'reference_images');

-- Should return 3 rows
```

### Test 3: Create Test Model
1. Go to https://fanova.com/model-info
2. Fill in basic info
3. Click "Next" → Should see Reference Images Upload page
4. Upload 3 test images
5. Click "Analyze Images" → Should show progress
6. Should see AttributesConfirmation page with extracted attributes
7. Click "Create Model & Generate Images"
8. Should generate images successfully

---

## 🎯 Rollback Plan (If Needed)

### If OpenAI Integration Fails
```bash
# Comment out the AI route
# In server/server.js:
# app.use('/api/ai', aiRouter);  // COMMENTED OUT

# Restart backend
pm2 restart fanova-backend

# Users will get error on upload page, but can still use old flow
```

### If Database Migration Fails
```sql
-- Rollback AI analysis fields
ALTER TABLE models
DROP COLUMN IF EXISTS ai_analysis,
DROP COLUMN IF EXISTS merged_prompt,
DROP COLUMN IF EXISTS reference_images;

-- Rollback atomic credit functions
DROP FUNCTION IF EXISTS deduct_credits_atomic(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_credits_for_update(UUID);
```

### If Frontend Build Fails
```bash
# Use previous build
cd /var/www/fanova
git checkout HEAD~1 -- build/

# Or rebuild from clean state
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📊 Monitoring

### Key Metrics to Watch
- **OpenAI API Calls:** Monitor usage at https://platform.openai.com/usage
- **Image Generation Success Rate:** Should improve significantly
- **User Feedback:** Model creation should be much easier

### Logs to Monitor
```bash
# Backend logs
pm2 logs fanova-backend --lines 100

# Look for:
✅ "🔍 Analyzing 3 reference images for model"
✅ "✅ Analysis merged successfully"
❌ "Error analyzing reference images"
❌ "OpenAI rate limit exceeded"
```

### Expected Log Patterns
```bash
# Good patterns:
🔍 Analyzing 3 reference images for model: Test Model
Analyzing image 1/3...
✅ Image 1 analyzed
Analyzing image 2/3...
✅ Image 2 analyzed
Analyzing image 3/3...
✅ Image 3 analyzed
🔄 Merging analysis and extracting attributes...
✅ Analysis merged successfully

# Bad patterns:
❌ Error analyzing reference images: insufficient_quota
❌ OPENAI_API_KEY not configured
❌ Failed to parse reference images
```

---

## 🔧 Troubleshooting

### Issue: "OPENAI_API_KEY not configured"
**Solution:**
1. Check `.env` file has `OPENAI_API_KEY=sk-...`
2. Restart backend: `pm2 restart fanova-backend`
3. Verify with: `pm2 env fanova-backend | grep OPENAI`

### Issue: "OpenAI rate limit exceeded"
**Solution:**
1. Check usage at https://platform.openai.com/usage
2. Upgrade OpenAI plan if needed
3. Implement rate limiting on frontend (TODO)

### Issue: "Image size must be less than 10MB"
**Solution:**
1. Tell users to compress images before upload
2. Consider adding image compression on frontend (TODO)

### Issue: Images not being analyzed
**Solution:**
1. Check backend logs for errors
2. Verify OpenAI API key is valid
3. Check Supabase can store JSONB data
4. Verify 50MB JSON limit in server.js

### Issue: Old models not generating
**Solution:**
Old models don't have `merged_prompt`, so they fall back to old method.
This is expected and correct behavior.

---

## 📈 Success Criteria

### After Deployment, You Should See:
✅ New model creation flow uses 3 reference images
✅ AI analysis extracts attributes automatically
✅ Generated images are much more consistent
✅ Users report easier model creation
✅ Fewer support requests about inconsistent results
✅ OpenAI costs are minimal (~$5/month for 100 models)

---

## 📞 Support

If you encounter issues:
1. Check this deployment checklist
2. Review logs: `pm2 logs fanova-backend`
3. Check [NEW_MODEL_GENERATION_SYSTEM.md](NEW_MODEL_GENERATION_SYSTEM.md) for details
4. Verify all environment variables are set
5. Ensure database migrations completed successfully

---

## 🎉 You're All Set!

Once all steps are complete:
- ✅ OpenAI package installed
- ✅ API key configured
- ✅ Database migrations run
- ✅ Frontend rebuilt
- ✅ Backend restarted
- ✅ Tests passed

Your new AI-powered model generation system is live! 🚀
