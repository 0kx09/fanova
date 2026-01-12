# How to Get Your Google AI Studio API Key (FREE)

The **easiest and FREE** way to get started with Fanova is using Google AI Studio's Imagen API.

## Step-by-Step Guide

### 1. Go to Google AI Studio
Visit: **https://aistudio.google.com/**

### 2. Sign In
- Click "Get API Key" or "Sign in with Google"
- Use your Google account (Gmail)

### 3. Get Your API Key
1. Click **"Get API key"** button in the top right
2. Click **"Create API key in new project"**
3. Your API key will be generated instantly
4. Click **Copy** to copy the key

### 4. Add to Your .env File
```bash
cd server
```

Create or edit `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fanova
GOOGLE_API_KEY=AIzaSyC...your_actual_key_here
```

### 5. That's It!
Start your server and it will automatically use Google Imagen for image generation.

## Important Notes

✅ **FREE to start** - Google gives you free quota
✅ **No credit card required** initially
✅ **Imagen 3** - High quality AI image generation
✅ **Person generation allowed** - Perfect for model photos

## Pricing (After Free Tier)

- **Free**: First 50 images/month
- **Paid**: ~$0.04 per image after free tier
- Check current pricing: https://ai.google.dev/pricing

## Troubleshooting

### "API key not valid"
- Make sure you copied the entire key
- No spaces before/after in .env file
- Restart your server after adding the key

### "Quota exceeded"
- You've used your free quota
- Add billing in Google Cloud Console
- Or wait until next month for quota reset

### API not enabled
If you get an error about API not enabled:
1. Go to: https://console.cloud.google.com/
2. Select your project
3. Enable "Generative Language API"

## Alternative Options

If you prefer NOT to use Google:

### Fal.ai (Flux Pro)
- Sign up: https://fal.ai
- Get API key from dashboard
- Add to .env: `FAL_AI_KEY=your_key`

### Replicate
- Sign up: https://replicate.com
- Get API token
- Add to .env: `REPLICATE_API_TOKEN=your_token`

## Test Your Setup

Once you've added the API key:

```bash
# Start backend
cd server
npm run dev

# Start frontend (new terminal)
cd ..
npm start
```

Then create a model and click "Generate Images" - you should see 3 AI-generated images!
