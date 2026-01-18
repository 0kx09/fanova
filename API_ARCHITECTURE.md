# Fanova API Architecture

## 🎯 Two Separate APIs - How They Work Together

### OpenAI GPT-5 API
**Purpose:** Analyze images and create prompts
**Does NOT:** Generate images

### Google Gemini API
**Purpose:** Generate images from prompts
**Does NOT:** Analyze images or create prompts

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER UPLOADS                              │
│                      3 REFERENCE IMAGES                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OPENAI GPT-5 API                              │
│                  (Analysis & Prompts)                            │
├─────────────────────────────────────────────────────────────────┤
│  Step 1: Analyze Image 1                                        │
│  → Detailed description of physical features                    │
│                                                                  │
│  Step 2: Analyze Image 2                                        │
│  → Detailed description of physical features                    │
│                                                                  │
│  Step 3: Analyze Image 3                                        │
│  → Detailed description of physical features                    │
│                                                                  │
│  Step 4: Merge All 3 Analyses                                   │
│  → Identify consistent attributes                               │
│  → Create unified description                                   │
│  → Extract structured attributes                                │
│                                                                  │
│  Output: Professional generation prompt                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │ MERGED PROMPT  │
                │ (stored in DB) │
                └────────┬───────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GOOGLE GEMINI API                               │
│                  (Image Generation)                              │
├─────────────────────────────────────────────────────────────────┤
│  Input: Merged prompt from GPT-5                                │
│                                                                  │
│  Process: Generate photorealistic images                        │
│  → Uses prompt to create consistent results                     │
│  → Applies natural lighting, 4K quality                         │
│  → Creates 3 high-quality images                                │
│                                                                  │
│  Output: 3 generated images                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   USER RECEIVES IMAGES                           │
│              (Consistent, High Quality)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Frontend (React)
```
ReferenceImagesUpload.js
    ↓
POST /api/ai/analyze-reference-images
    ↓
AttributesConfirmation.js
    ↓
Create Model in Database
    ↓
GenerateResults.js
    ↓
POST /api/models/:id/generate
    ↓
Images displayed to user
```

### Backend (Express + APIs)

#### Route 1: Analyze Images (OpenAI GPT-5)
```javascript
POST /api/ai/analyze-reference-images

Input: 3 base64 images
Process:
  - Call GPT-5 Vision API 3 times (one per image)
  - Call GPT-5 Chat API once (merge analyses)
Output: Merged prompt + extracted attributes

DOES NOT generate images!
```

#### Route 2: Generate Images (Google Gemini)
```javascript
POST /api/models/:id/generate

Input: Model ID (contains merged_prompt)
Process:
  - Fetch merged_prompt from database
  - Call Google Gemini API
  - Generate 3 images
Output: Image URLs

DOES NOT analyze images!
```

---

## 💰 Cost Breakdown

### OpenAI GPT-5 (Analysis Only)
- Per model creation: ~$0.04-0.06
- 100 models/month: ~$5
- Very cheap for the quality!

### Google Gemini (Image Generation)
- Per 3 images: ~$0.XX (existing cost)
- No change from before

**Total Additional Cost:** ~$5/month for GPT-5 analysis

---

## 🔑 Environment Variables

```bash
# .env file

# OpenAI API - For analyzing images and creating prompts
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_VISION_MODEL=gpt-5        # Optional, defaults to gpt-5
OPENAI_CHAT_MODEL=gpt-5          # Optional, defaults to gpt-5

# Google Gemini API - For generating images
GOOGLE_API_KEY=your-key-here     # Already configured
```

---

## 🔀 Fallback Behavior

### If GPT-5 Not Available
```javascript
1. Try GPT-5 first
2. If 404 error → automatically fallback to GPT-4o
3. Log: "⚠️ gpt-5 not available, falling back to gpt-4o..."
4. Continue normally with GPT-4o
```

No user impact - seamless fallback!

---

## 📝 Example API Calls

### 1. Analyze Images (OpenAI)
```bash
POST /api/ai/analyze-reference-images
{
  "images": [
    "data:image/png;base64,iVBORw0KG...",
    "data:image/png;base64,iVBORw0KG...",
    "data:image/png;base64,iVBORw0KG..."
  ],
  "modelName": "Sophia"
}

Response:
{
  "success": true,
  "analysis": [
    "Detailed description of image 1...",
    "Detailed description of image 2...",
    "Detailed description of image 3..."
  ],
  "extractedAttributes": {
    "hair_color": "blonde",
    "eye_color": "blue",
    "skin_tone": "fair",
    ...
  },
  "mergedPrompt": "A young woman with blonde hair and blue eyes..."
}
```

### 2. Generate Images (Google Gemini)
```bash
POST /api/models/123/generate
{
  "numImages": 3
}

Process:
1. Fetch model 123 from database
2. Get merged_prompt field
3. Call Google Gemini with prompt
4. Return generated images

Response:
{
  "success": true,
  "images": [
    "https://...",
    "https://...",
    "https://..."
  ],
  "prompt": "The merged prompt used..."
}
```

---

## ✅ Key Points to Remember

1. **Two APIs, Two Jobs**
   - OpenAI GPT-5 = Analysis & Prompts
   - Google Gemini = Image Generation

2. **GPT-5 Never Generates Images**
   - It only looks at images and writes descriptions
   - The descriptions become prompts

3. **Google Gemini Never Analyzes Images**
   - It only takes prompts and generates images
   - No image analysis capability

4. **They Work Together**
   - GPT-5 creates the prompt
   - Prompt is stored in database
   - Google Gemini reads prompt and generates

5. **Automatic Fallback**
   - If GPT-5 not available → use GPT-4o
   - No manual intervention needed
   - Logs the fallback for monitoring

---

## 🚀 Why This Architecture?

### Before (Old System)
- Manual attribute selection
- Generic prompts
- Inconsistent results
- Bad user experience

### After (New System)
- **GPT-5:** Expertly analyzes real images
- **GPT-5:** Creates professional prompts
- **Google Gemini:** Generates from quality prompts
- Consistent, high-quality results
- Amazing user experience!

Each API does what it's best at:
- GPT-5 = Best at understanding images & language
- Google Gemini = Best at generating images

Perfect combination! 🎯
