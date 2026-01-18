const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * POST /api/ai/analyze-reference-images
 *
 * IMPORTANT: This endpoint uses Google Gemini Vision API for analyzing images
 * Image generation is also done by Google Gemini API
 *
 * Flow:
 * 1. User uploads 3 reference images (base64)
 * 2. Gemini analyzes each image (detailed descriptions)
 * 3. Gemini merges analyses into unified prompt
 * 4. Prompt is sent to Google Gemini for actual image generation
 */
router.post('/analyze-reference-images', async (req, res) => {
  try {
    const { images, modelName } = req.body;

    if (!images || images.length !== 3) {
      return res.status(400).json({
        error: 'Please provide exactly 3 reference images'
      });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({
        error: 'Google API key not configured'
      });
    }

    console.log(`🔍 Analyzing 3 reference images for model: ${modelName} using Google Gemini Vision`);

    // Analyze each image individually with Gemini Vision
    const analysis = [];

    for (let i = 0; i < images.length; i++) {
      console.log(`Analyzing image ${i + 1}/3 with Gemini Vision...`);

      // Extract base64 data from data URL
      const base64Data = images[i].split(',')[1] || images[i];

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
        {
          contents: [{
            parts: [
              {
                text: `You are an AI art director creating detailed character descriptions for AI image generation.

Analyze this reference photo and create a comprehensive character description that captures the visual aesthetic and style. This will be used to generate original artwork.

Provide a detailed description including:
- Gender: Male or Female (IMPORTANT: Get this right!)
- Overall aesthetic and vibe
- Hair: EXACT color (be accurate!), length, style, texture
- Facial features and structure
- Skin tone and complexion
- Body type and build
- Fashion style and clothing (casual, elegant, athletic, provocative, modest, etc.)
- Clothing coverage level (revealing, modest, average)
- Makeup and cosmetics: Describe any visible makeup including lipstick/lip gloss color, eyeshadow, mascara, eyeliner, foundation, blush, contouring, brow styling, nail polish if visible. Note the makeup style (natural, glamorous, bold, minimal, etc.)
- Styling details: Hair styling, accessories (jewelry, piercings), overall grooming and presentation style
- Any distinctive visual elements
- Mood and atmosphere

Be VERY specific about colors, proportions, and visual details. Pay special attention to getting the GENDER, hair color, and makeup style correct. Include makeup details even if minimal or natural-looking. This is for creating fictional artwork.`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GOOGLE_API_KEY
          }
        }
      );

      const description = response.data.candidates[0].content.parts[0].text;
      analysis.push(description);
      console.log(`✅ Image ${i + 1} analyzed with Gemini`);
    }

    console.log(`🔄 Merging analysis and extracting attributes with Gemini...`);

    // Now merge the 3 analyses and extract common attributes using Gemini
    const mergeResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
      {
        contents: [{
          parts: [{
            text: `You are creating a unified character description for AI artwork generation based on 3 reference descriptions.

Here are 3 detailed character descriptions from different reference images:

DESCRIPTION 1:
${analysis[0]}

DESCRIPTION 2:
${analysis[1]}

DESCRIPTION 3:
${analysis[2]}

Task:
1. Identify CONSISTENT visual themes and characteristics across all 3 descriptions
2. Create a merged, unified character description for AI image generation
3. Extract key attributes in a structured format

Focus on the ACTUAL visual details that appear consistently across all 3 images. Be ACCURATE about colors (especially hair color), features, and style. Don't make up colors that aren't there!

Respond in ONLY valid JSON format (no markdown, no code blocks):
{
  "mergedDescription": "A unified character description combining consistent visual elements from all 3 references, including makeup and styling details",
  "attributes": {
    "gender": "Male or Female",
    "hair_color": "extracted value",
    "hair_style": "extracted value",
    "eye_color": "extracted value",
    "skin_tone": "extracted value",
    "face_shape": "extracted value",
    "body_type": "extracted value",
    "distinctive_features": "extracted value",
    "style_aesthetic": "extracted value",
    "clothing_style": "extracted value (casual/elegant/athletic/provocative/modest)",
    "clothing_coverage": "extracted value (revealing/modest/average)",
    "makeup_style": "extracted value (natural/minimal/glamorous/bold/heavy/none)",
    "makeup_details": "detailed description of makeup including lipstick color, eyeshadow, mascara, etc. or 'no visible makeup' if none",
    "styling_details": "hair styling, accessories, grooming details"
  }
}`
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GOOGLE_API_KEY
        }
      }
    );

    let mergedText = mergeResponse.data.candidates[0].content.parts[0].text;

    // Remove markdown code blocks if present
    mergedText = mergedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const mergedData = JSON.parse(mergedText);
    console.log('✅ Analysis merged successfully');

    // Clean the merged description to remove mirror selfie references
    let cleanedDescription = mergedData.mergedDescription || '';
    // Remove mirror/mirror selfie references
    cleanedDescription = cleanedDescription
      .replace(/mirror\s+selfie/gi, 'selfie')
      .replace(/mirror\s+reflection/gi, 'direct view')
      .replace(/reflection\s+in\s+mirror/gi, 'direct camera view')
      .replace(/standing\s+in\s+front\s+of\s+mirror/gi, 'standing directly in front of camera')
      .replace(/viewing\s+reflection/gi, 'looking directly at camera')
      .replace(/full\s+length\s+mirror/gi, 'direct camera angle')
      .replace(/mirror/gi, 'direct camera');

    // Create the final generation prompt with iPhone-quality requirements
    // CRITICAL: This creates close-up portraits with clear face visibility for reference image locking
    // IMPORTANT: Front-facing selfie (passport photo style), NOT mirror reflection
    // Make it attractive and beautiful
    const generationPrompt = `Beautiful, attractive ${cleanedDescription}. Front-facing close-up selfie portrait, passport photo style, person looking directly at camera, face clearly visible from shoulders up, NOT a mirror selfie or reflection, no mirror visible, direct camera angle, attractive features, beautiful appearance, photogenic, taken with iPhone front camera quality with natural imperfections and slight grain, natural daylight lighting, soft flattering light, shallow depth of field, photorealistic, 4K resolution, clear eyes and hair details captured, high quality, professional photo aesthetic.`;

    res.json({
      success: true,
      analysis: analysis, // Individual image analyses
      extractedAttributes: mergedData.attributes, // Structured attributes
      mergedPrompt: generationPrompt, // Final prompt for image generation
      mergedDescription: mergedData.mergedDescription
    });

  } catch (error) {
    console.error('Error analyzing reference images:', error.response?.data || error);

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Google API rate limit exceeded. Please try again in a moment.'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to analyze images. Please try again.'
    });
  }
});

/**
 * POST /api/ai/enhance-prompt
 * Enhance a prompt using Google Gemini (used for generating with existing models)
 *
 * IMPORTANT: This only creates/enhances the prompt
 * Actual image generation is done by Google Gemini API
 */
router.post('/enhance-prompt', async (req, res) => {
  try {
    const { basePrompt, userInput } = req.body;

    if (!basePrompt || !userInput) {
      return res.status(400).json({
        error: 'basePrompt and userInput are required'
      });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({
        error: 'Google API key not configured'
      });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
      {
        contents: [{
          parts: [{
            text: `You create detailed image generation prompts. Combine the base description with the user's request into a cohesive, detailed prompt.

Base character description: ${basePrompt}

User wants: ${userInput}

Create a detailed image generation prompt that maintains the character's core appearance while incorporating the user's request. Be specific and descriptive.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GOOGLE_API_KEY
        }
      }
    );

    const enhancedPrompt = response.data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      enhancedPrompt: enhancedPrompt
    });

  } catch (error) {
    console.error('Error enhancing prompt:', error.response?.data || error);
    res.status(500).json({
      error: error.message || 'Failed to enhance prompt'
    });
  }
});

module.exports = router;
