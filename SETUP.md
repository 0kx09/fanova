# Fanova Setup Guide

Complete setup instructions for the Fanova AI Model Creator.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Image Generation API key (Fal.ai or Replicate)

## Backend Setup

### 1. Install MongoDB

**Option A: Local MongoDB**
- Download from https://www.mongodb.com/try/download/community
- Install and start the service

**Option B: MongoDB Atlas (Cloud - Recommended)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a new cluster
- Click "Connect" → "Connect your application"
- Copy the connection string

### 2. Get Image Generation API Key

**Option A: Fal.ai (Recommended - Faster)**
1. Go to https://fal.ai
2. Sign up for an account
3. Navigate to Dashboard → API Keys
4. Create a new API key
5. Copy the key

**Option B: Replicate (Alternative)**
1. Go to https://replicate.com
2. Sign up for an account
3. Go to Account → API Tokens
4. Copy your API token

### 3. Configure Backend

```bash
cd server
npm install
```

Create `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fanova
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fanova

# Use Fal.ai (recommended)
FAL_AI_KEY=your_fal_ai_key_here

# OR use Replicate
# REPLICATE_API_TOKEN=your_replicate_token_here
```

### 4. Start Backend Server

```bash
# From the server directory
npm run dev
```

Server should start on `http://localhost:5000`

## Frontend Setup

### 1. Install Dependencies

```bash
# From the root directory
npm install
```

### 2. Start Frontend

```bash
npm start
```

Frontend should start on `http://localhost:3000`

## Full Stack Development

To run both frontend and backend together:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm start
```

## Testing the Integration

1. Open http://localhost:3000
2. Register with an email
3. Fill in model information (name, age, etc.)
4. Add model attributes (hair, eyes, skin tone, etc.)
5. Choose "Describe Your Model"
6. Customize facial features
7. Click "Generate Images"
8. Wait for AI to generate 3 images

## API Endpoints

The backend exposes these endpoints:

```
POST   /api/models                       - Create model profile
PUT    /api/models/:id/attributes        - Add attributes
PUT    /api/models/:id/facial-features   - Add facial features
POST   /api/models/:id/generate          - Generate images
GET    /api/models/:id                   - Get specific model
GET    /api/models/user/:userId          - Get user's models
DELETE /api/models/:id                   - Delete model
```

## How It Works

1. **User registers** → Frontend stores user ID in localStorage
2. **Create profile** → POST to `/api/models` with basic info
3. **Add attributes** → PUT to `/api/models/:id/attributes`
4. **Add features** → PUT to `/api/models/:id/facial-features`
5. **Generate** → POST to `/api/models/:id/generate`
   - Backend generates detailed prompt from all data
   - Calls Fal.ai/Replicate API
   - Returns 3 generated image URLs
   - Stores everything in MongoDB

## Prompt Generation Example

**Input Data:**
```json
{
  "name": "Sophia",
  "age": 25,
  "attributes": {
    "hairColor": "blonde",
    "hairStyle": "wavy",
    "hairLength": "long",
    "eyeColor": "blue",
    "skinTone": "fair"
  },
  "facialFeatures": {
    "faceShape": "Oval",
    "eyeShape": "Almond",
    "noseShape": "Button",
    "lipShape": "Full",
    "expression": "Confident",
    "lighting": "Natural"
  }
}
```

**Generated Prompt:**
```
Professional portrait photograph of a model, 25 years old, long wavy blonde hair, blue eyes, fair skin tone, Oval face shape, Almond eyes, Button nose, Full lips, Confident expression, Natural lighting, high quality, detailed, professional photography, 8k resolution, sharp focus
```

## Troubleshooting

### MongoDB Connection Failed
- Make sure MongoDB is running: `mongod`
- Check connection string in `.env`
- For Atlas: whitelist your IP address

### Image Generation Failed
- Verify API key is correct in `.env`
- Check you have credits/quota
- Try the alternative API (Fal.ai ↔ Replicate)

### CORS Errors
- Make sure backend is running on port 5000
- Frontend proxy is configured in `package.json`

### Port Already in Use
- Backend: Change `PORT` in server `.env`
- Frontend: It will prompt you to use different port

## Cost Considerations

- **MongoDB Atlas**: Free tier available (512MB)
- **Fal.ai**: Pay per generation (~$0.05-0.10 per image)
- **Replicate**: Pay per second of compute

## Next Steps

- Add user authentication (JWT)
- Implement file upload for reference images
- Add payment integration for premium features
- Deploy to production (Vercel + Railway/Render)
