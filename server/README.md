# Fanova Backend API

Backend server for Fanova AI Model Creator.

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fanova

# Image Generation API (choose one)
FAL_AI_KEY=your_fal_ai_key_here
# OR
REPLICATE_API_TOKEN=your_replicate_token_here
```

### 3. Install and Start MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# Then start the service
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get connection string and update `MONGODB_URI` in `.env`

### 4. Get Image Generation API Key

**Option A: Fal.ai (Recommended)**
1. Sign up at https://fal.ai
2. Get your API key from dashboard
3. Add to `.env` as `FAL_AI_KEY`

**Option B: Replicate**
1. Sign up at https://replicate.com
2. Get API token
3. Add to `.env` as `REPLICATE_API_TOKEN`

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Create Model Profile
```
POST /api/models
Body: {
  "name": "Model Name",
  "age": 25,
  "height": 175,
  "nationality": "American",
  "userId": "user123"
}
```

### Add Attributes
```
PUT /api/models/:id/attributes
Body: {
  "attributes": {
    "hairColor": "blonde",
    "eyeColor": "blue",
    "skinTone": "fair",
    ...
  }
}
```

### Add Facial Features
```
PUT /api/models/:id/facial-features
Body: {
  "facialFeatures": {
    "faceShape": "Oval",
    "eyeShape": "Almond",
    "noseShape": "Button",
    ...
  }
}
```

### Generate Images
```
POST /api/models/:id/generate
Body: {
  "numImages": 3
}
```

### Get Model
```
GET /api/models/:id
```

### Get User's Models
```
GET /api/models/user/:userId
```

### Delete Model
```
DELETE /api/models/:id
```

## How It Works

1. **Create Profile**: User fills model info → Creates profile in database
2. **Add Attributes**: User selects attributes → Stored in model document
3. **Facial Features**: User customizes features → Stored in model document
4. **Generate**:
   - Backend generates detailed prompt from all attributes
   - Calls image generation API (Fal.ai or Replicate)
   - Returns 3 generated images
   - Stores images and prompt in database

## Prompt Generation Example

Input:
```json
{
  "name": "Sophia",
  "age": 25,
  "attributes": {
    "hairColor": "blonde",
    "hairStyle": "wavy",
    "eyeColor": "blue"
  },
  "facialFeatures": {
    "faceShape": "Oval",
    "expression": "Confident"
  }
}
```

Generated Prompt:
```
Professional portrait photograph of a model, 25 years old, wavy blonde hair, blue eyes, Oval face shape, Confident expression, high quality, detailed, professional photography, 8k resolution, sharp focus
```

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check `MONGODB_URI` in `.env`
- For Atlas, check IP whitelist

### Image Generation Fails
- Verify API key is correct
- Check API quota/credits
- Review console logs for specific error

### Port Already in Use
- Change `PORT` in `.env`
- Or kill process using port 5000
