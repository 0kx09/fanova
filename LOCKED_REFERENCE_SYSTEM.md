# Locked Reference Image System

## 🎯 Overview

The Locked Reference System ensures **perfect consistency** across all image generations for a model by using a single, user-selected reference image.

---

## 🔒 How It Works

### Step 1: Initial Generation (iPhone-Quality Close-Ups)
When a user creates a new model:

1. **Upload 3 Reference Images** → GPT-5 analyzes
2. **GPT-5 Creates Prompt** → Includes special iPhone-quality requirements:
   ```
   Close-up portrait shot, face clearly visible from shoulders up,
   taken with iPhone camera quality with natural imperfections and slight grain,
   natural daylight lighting, shallow depth of field, photorealistic,
   4K resolution, clear eyes and hair details captured.
   ```
3. **Google Gemini Generates 3 Images** → All are iPhone-quality close-up portraits
4. **User Selects ONE Image** → This becomes the LOCKED REFERENCE

### Step 2: Lock the Reference
```javascript
// When user clicks "Confirm Selection"
await supabase
  .from('models')
  .update({
    locked_reference_image: selectedImage.url  // 🔒 Locked!
  })
  .eq('id', modelId);
```

### Step 3: Future Generations (Automatic Reference Use)
When generating from dashboard chat:

1. **User types prompt** (e.g., "standing in a coffee shop")
2. **System automatically:**
   - Retrieves `locked_reference_image` from database
   - Uses it as reference for image-to-image generation
   - Combines user prompt with locked identity

```javascript
// Backend automatically uses locked reference
const referenceImageUrl = model.locked_reference_image;
// Generate with reference for perfect consistency
await generateImages(prompt, negativePrompt, numImages, referenceImageUrl);
```

**Result:** Every generated image maintains the exact face/features from the locked reference!

---

## 📁 Database Schema

### models table - New Field
```sql
ALTER TABLE models
ADD COLUMN locked_reference_image TEXT;
```

**Description:** Stores the URL of the user-selected reference image

**Usage:**
- Set once during initial model creation
- Used automatically for all future generations
- Never changes unless user manually re-selects

---

## 🎨 UI/UX Flow

### Initial Selection Screen
```
┌────────────────────────────────────────────────┐
│  Select Your Reference Image                   │
│                                                │
│  Choose ONE image that will be used as your   │
│  model's locked reference for all future      │
│  generations. This ensures perfect consistency!│
│                                                │
│  📌 Important: Pick the one with the clearest │
│  face, good lighting, and best captures the   │
│  model's appearance.                          │
└────────────────────────────────────────────────┘

[Image 1]   [Image 2]   [Image 3]
   ↑          Click
Selected     to select

✓ REFERENCE IMAGE badge appears on selected

[Confirm Selection] button
```

### Dashboard Chat (Automatic Use)
```
User types: "standing in a coffee shop"

System automatically:
1. Gets locked_reference_image from database
2. Combines it with user prompt
3. Generates with image-to-image

Result: Model standing in coffee shop,
        with EXACT same face as reference!
```

---

## 🔧 Technical Implementation

### Frontend (GenerateResults.js)

```javascript
// User selects image
const [selectedImageIndex, setSelectedImageIndex] = useState(null);

// Lock the reference
const handleConfirmSelection = async () => {
  const selectedImage = generatedImages[selectedImageIndex];

  // Save as locked reference
  await supabase
    .from('models')
    .update({
      locked_reference_image: selectedImage.url
    })
    .eq('id', modelId);

  console.log('🔒 Reference image locked!');
};
```

### Backend (models.js - Chat Generation)

```javascript
// Automatically use locked reference
router.post('/:id/generate-chat', async (req, res) => {
  const model = await getModel(id);

  // Use locked reference (or fallback to original)
  let referenceImageUrl = model.locked_reference_image;

  if (!referenceImageUrl) {
    // Fallback for old models
    referenceImageUrl = model.reference_images?.[0];
  }

  // Generate with reference for consistency
  const images = await generateImages(
    prompt,
    negativePrompt,
    numImages,
    referenceImageUrl  // 🔒 Automatic consistency!
  );
});
```

### Image Generation (imageGenerator.js)

```javascript
// Google Gemini supports image-to-image
async function generateWithGoogleImagen(prompt, negativePrompt, numImages, referenceImageUrl) {
  if (referenceImageUrl) {
    // Use reference for consistency
    requestBody.image_url = referenceImageUrl;
    requestBody.strength = 0.6; // Balance between reference and prompt
  }
  // ... generate
}
```

---

## 💡 Why This Works

### Problem Before
- User types "standing in coffee shop"
- System generates from text description only
- Face looks different each time
- Inconsistent results 😞

### Solution Now
- User types "standing in coffee shop"
- System uses locked reference image
- Face stays EXACTLY the same
- User's prompt only changes pose/location
- Perfect consistency! 🎯

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│           LOCKED REFERENCE SYSTEM                   │
└─────────────────────────────────────────────────────┘

INITIAL CREATION:
┌──────────────┐
│ Upload 3     │
│ Reference    │
│ Images       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ GPT-5        │
│ Analyzes &   │
│ Creates      │
│ Prompt       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Google       │
│ Gemini       │
│ Generates 3  │
│ iPhone-      │
│ Quality      │
│ Close-Ups    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ User Selects │
│ ONE Image    │
│ 🔒 LOCKED    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Saved to DB: │
│ locked_      │
│ reference_   │
│ image        │
└──────────────┘

FUTURE GENERATIONS:
┌──────────────┐
│ User types:  │
│ "in coffee   │
│  shop"       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ System gets: │
│ locked_      │
│ reference_   │
│ image        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Google       │
│ Gemini       │
│ image-to-    │
│ image with   │
│ reference    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Perfect      │
│ Consistency! │
│ Same face +  │
│ new scene    │
└──────────────┘
```

---

## ✅ Benefits

1. **Perfect Consistency**
   - Same face/features across ALL generations
   - No more random variations
   - Professional-quality results

2. **User Control**
   - User picks their favorite reference
   - One-time selection
   - Works automatically after that

3. **Simple UX**
   - User just types what they want
   - System handles consistency automatically
   - No complex settings needed

4. **iPhone-Quality References**
   - Close-up portraits with clear faces
   - Natural lighting and imperfections
   - Perfect for reference locking

5. **Backward Compatible**
   - Falls back to original references for old models
   - No breaking changes
   - Gradual rollout possible

---

## 🎯 Example Use Cases

### Use Case 1: Standing in Coffee Shop
```
User creates model → Selects reference image
Later: "standing in a coffee shop"
Result: SAME FACE, standing in coffee shop ✅
```

### Use Case 2: Wearing Red Dress
```
User: "wearing a red dress at sunset"
Result: SAME FACE, red dress, sunset ✅
```

### Use Case 3: Different Poses
```
User: "laughing with friends"
Result: SAME FACE, laughing with friends ✅
```

**Every time:** Perfect face consistency! 🎯

---

## 🔄 Migration Guide

### For Existing Models
Old models without `locked_reference_image`:

```javascript
if (!model.locked_reference_image) {
  // Fallback to first uploaded reference
  const referenceImageUrl = model.reference_images?.[0];
  console.log('⚠️ Using fallback reference (old model)');
}
```

### For New Models
New models created after this update:

```javascript
// locked_reference_image is always set
const referenceImageUrl = model.locked_reference_image;
console.log('🔒 Using locked reference');
```

---

## 📝 Implementation Checklist

- [x] Update GPT-5 prompt to create iPhone-quality close-ups
- [x] Add `locked_reference_image` field to models table
- [x] Update GenerateResults UI to select ONE image
- [x] Save locked reference on selection
- [x] Update chat generation to use locked reference
- [x] Add fallback for old models
- [x] Add CSS styling for selection UI
- [x] Create documentation

---

## 🚀 Deployment

### 1. Run Migration
```bash
psql -h <supabase-host> -U postgres -d postgres \
  -f server/migrations/add-locked-reference-image.sql
```

### 2. Deploy Code
```bash
npm run build
pm2 restart fanova-backend
```

### 3. Test
1. Create new model
2. Select reference image
3. Generate from dashboard
4. Verify consistency!

---

## 🎉 Result

**Perfect consistency across all generations!**

Users can now:
- Create a model once
- Select their favorite reference
- Generate unlimited variations
- Always get the same face/features

**The system just works!** 🚀
