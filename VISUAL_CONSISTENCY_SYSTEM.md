# Visual Consistency System for AI Chat Image Generation

## Overview

The visual consistency system ensures that when generating new images in the AI chat, they maintain the same appearance as previously generated images of the model. This is achieved through a multi-layered approach using OpenAI Vision API and image-to-image generation.

## How It Works

### 1. Reference Image Retrieval
- When generating new images, the system automatically fetches the model's existing generated images
- **Priority**: Selected image (if available) → Most recent images (up to 3)
- These images serve as the "reference" for maintaining consistency

### 2. Visual Analysis with OpenAI Vision API
- The reference image is analyzed using GPT-4o Vision API
- Extracts key visual characteristics:
  - Facial features (face shape, eye shape, nose, lips, distinctive features)
  - Hair characteristics (color, style, length, texture)
  - Skin tone and complexion
  - Body type and proportions
  - Overall appearance style
- Generates a "consistency prompt" that describes these features

### 3. Prompt Enhancement
The system uses **two methods** for consistency:

#### Method A: Vision-Enhanced Prompt (Primary)
- Reference image is included directly in the OpenAI prompt enhancement call
- GPT-4o Vision analyzes the image while creating the prompt
- Ensures the prompt includes visual details that match the reference
- Works with any image generation API

#### Method B: Image-to-Image Generation (Fal.ai only)
- If using Fal.ai API and a reference image is available
- Uses image-to-image generation with `strength: 0.6`
- Directly uses the reference image as input
- Best for maintaining exact facial features

### 4. Combined Approach
The system combines both methods:
1. Vision API analyzes reference → enhances prompt with visual details
2. Enhanced prompt + reference image → image-to-image generation (if Fal.ai)
3. Result: New images that look like the same person

## Technical Implementation

### Files Created/Modified

1. **`server/services/imageConsistencyService.js`** (NEW)
   - `getModelReferenceImages()` - Fetches existing model images
   - `imageUrlToBase64()` - Converts image URLs to base64 for Vision API
   - `analyzeModelImageForConsistency()` - Analyzes image with Vision API
   - `enhancePromptWithVisualConsistency()` - Enhances prompts with visual features

2. **`server/services/promptEnhancer.js`** (MODIFIED)
   - Added `referenceImageBase64` parameter
   - Includes reference image in Vision API call when available
   - GPT-4o Vision analyzes image while creating prompt

3. **`server/services/imageGenerator.js`** (MODIFIED)
   - Added `referenceImageUrl` parameter to `generateWithFalAi()`
   - Supports image-to-image generation with Fal.ai
   - Added `referenceImageUrl` parameter to `generateImages()`

4. **`server/routes/models.js`** (MODIFIED)
   - Fetches reference images before generation
   - Passes reference image to prompt enhancement
   - Passes reference image to image generation

## API Support

### OpenAI Vision API
- ✅ **Supported**: Used for analyzing reference images
- ✅ **Required**: `OPENAI_API_KEY` environment variable
- ✅ **Works with**: All image generation APIs

### Fal.ai Image-to-Image
- ✅ **Supported**: Direct image-to-image generation
- ✅ **Required**: `FAL_AI_KEY` environment variable
- ✅ **Strength**: 0.6 (60% reference, 40% new prompt)
- ✅ **Best for**: Maintaining exact facial features

### Google Imagen
- ⚠️ **Limited**: No direct image-to-image support
- ✅ **Works with**: Vision-enhanced prompts (Method A)
- ✅ **Still benefits**: From visual consistency analysis

### Replicate
- ⚠️ **Limited**: No direct image-to-image support
- ✅ **Works with**: Vision-enhanced prompts (Method A)
- ✅ **Still benefits**: From visual consistency analysis

## Benefits

1. **Consistency**: New images look like the same person
2. **Flexibility**: Works with different settings/poses/clothing
3. **Automatic**: No user action required - happens automatically
4. **Fallback**: Works even if reference images aren't available
5. **Multi-layered**: Uses both prompt enhancement and image-to-image

## Example Flow

1. User has model with existing generated images
2. User types in chat: "Generate images at the beach"
3. System:
   - Fetches selected/recent image from model
   - Analyzes image with Vision API → extracts facial features, hair, etc.
   - Enhances prompt: "beach scene, same person with [specific facial features from analysis]"
   - If Fal.ai: Uses image-to-image with reference + enhanced prompt
   - If other API: Uses enhanced prompt with visual details
4. Result: Beach images that look like the same person

## Configuration

### Required Environment Variables

```env
# For Vision API analysis (required for consistency)
OPENAI_API_KEY=sk-...

# For image-to-image generation (optional but recommended)
FAL_AI_KEY=...

# Or alternative APIs
GOOGLE_API_KEY=...
REPLICATE_API_TOKEN=...
```

### How to Enable

1. **Ensure OpenAI API Key is set** - Required for visual analysis
2. **Set Fal.ai key** (optional) - For best results with image-to-image
3. **System works automatically** - No additional configuration needed

## Troubleshooting

### Images don't look consistent
- Check if model has existing generated images
- Verify `OPENAI_API_KEY` is set correctly
- Check server logs for Vision API errors
- Ensure reference images are accessible (not deleted)

### Vision API errors
- Verify OpenAI API key is valid
- Check API quota/limits
- Ensure images are in supported format (JPEG/PNG)
- Check image URLs are accessible

### Image-to-image not working
- Verify `FAL_AI_KEY` is set (only Fal.ai supports this)
- Check Fal.ai API supports image-to-image for your model
- Fallback to prompt-only enhancement will still work

## Performance

- **Vision API call**: ~2-3 seconds per analysis
- **Image conversion**: ~1-2 seconds per image
- **Total overhead**: ~3-5 seconds for consistency features
- **Worth it**: Significantly better consistency

## Future Enhancements

Potential improvements:
- Cache visual analysis results
- Support multiple reference images
- Adjustable consistency strength
- Face embedding matching
- Style transfer options
