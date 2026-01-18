const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/ai/analyze-reference-images
 *
 * IMPORTANT: This endpoint uses OpenAI GPT-5 ONLY for analyzing images and creating prompts
 * It does NOT generate images - image generation is done by Google Gemini API
 *
 * Flow:
 * 1. User uploads 3 reference images
 * 2. GPT-5 analyzes each image (detailed descriptions)
 * 3. GPT-5 merges analyses into unified prompt
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

    // Use GPT-5 Nano for fast, cost-effective image analysis
    let visionModel = process.env.OPENAI_VISION_MODEL || "gpt-5-nano-2025-08-07";

    console.log(`🔍 Analyzing 3 reference images for model: ${modelName} using ${visionModel}`);

    // Analyze each image individually with GPT-5 Nano Vision
    const analysis = [];

    for (let i = 0; i < images.length; i++) {
      console.log(`Analyzing image ${i + 1}/3 with ${visionModel}...`);

      let response;
      try {
        response = await openai.chat.completions.create({
          model: visionModel,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an AI art director helping to create fictional character descriptions for image generation.

Based on this reference photo, create a detailed character description that captures the visual aesthetic and style. This will be used to generate original artwork of a fictional character with similar visual characteristics.

Describe:
- Overall aesthetic and vibe
- Hair: color, length, style, texture
- General facial features and structure
- Skin tone and complexion
- Body type and build
- Fashion style and clothing
- Color palette and visual themes
- Artistic style and mood

Write a detailed prompt suitable for AI image generation. This is for creating original fictional artwork, not recreating or identifying any real person.`
              },
              {
                type: "image_url",
                image_url: {
                  url: images[i]
                }
              }
            ]
          }
        ],
        max_tokens: 500
        });
      } catch (modelError) {
        // If GPT-5 Nano fails, fallback to GPT-4o
        if (modelError.status === 404 || modelError.message?.includes('model') || modelError.message?.includes('gpt-5')) {
          console.log(`⚠️ ${visionModel} not available, falling back to gpt-4o...`);
          visionModel = "gpt-4o";

          response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `You are an AI art director helping to create fictional character descriptions for image generation.

Based on this reference photo, create a detailed character description that captures the visual aesthetic and style. This will be used to generate original artwork of a fictional character with similar visual characteristics.

Describe:
- Overall aesthetic and vibe
- Hair: color, length, style, texture
- General facial features and structure
- Skin tone and complexion
- Body type and build
- Fashion style and clothing
- Color palette and visual themes
- Artistic style and mood

Write a detailed prompt suitable for AI image generation. This is for creating original fictional artwork, not recreating or identifying any real person.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: images[i]
                    }
                  }
                ]
              }
            ],
            max_tokens: 500
          });
        } else {
          throw modelError;
        }
      }

      const description = response.choices[0].message.content;
      analysis.push(description);
      console.log(`✅ Image ${i + 1} analyzed with ${visionModel}`);
    }

    console.log(`🔄 Merging analysis and extracting attributes with ${visionModel}...`);

    // Now merge the 3 analyses and extract common attributes using GPT-5
    const mergeResponse = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing and synthesizing visual descriptions for AI image generation."
        },
        {
          role: "user",
          content: `You are creating a unified character description for AI artwork generation based on 3 reference descriptions.

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

This is for generating original fictional character artwork. Focus on the artistic style and visual aesthetic.

Respond in the following JSON format:
{
  "mergedDescription": "A unified character description combining consistent visual elements from all 3 references",
  "attributes": {
    "hair_color": "extracted value",
    "hair_style": "extracted value",
    "eye_color": "extracted value",
    "skin_tone": "extracted value",
    "face_shape": "extracted value",
    "body_type": "extracted value",
    "distinctive_features": "extracted value",
    "style_aesthetic": "extracted value"
  }
}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    const mergedData = JSON.parse(mergeResponse.choices[0].message.content);
    console.log('✅ Analysis merged successfully');

    // Create the final generation prompt with iPhone-quality requirements
    // CRITICAL: This creates close-up portraits with clear face visibility for reference image locking
    const generationPrompt = `${mergedData.mergedDescription}. Close-up portrait shot, face clearly visible from shoulders up, taken with iPhone camera quality with natural imperfections and slight grain, natural daylight lighting, shallow depth of field, photorealistic, 4K resolution, clear eyes and hair details captured.`;


    res.json({
      success: true,
      analysis: analysis, // Individual image analyses
      extractedAttributes: mergedData.attributes, // Structured attributes
      mergedPrompt: generationPrompt, // Final prompt for image generation
      mergedDescription: mergedData.mergedDescription
    });

  } catch (error) {
    console.error('Error analyzing reference images:', error);

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'OpenAI rate limit exceeded. Please try again in a moment.'
      });
    }

    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        error: 'OpenAI API quota exceeded. Please contact support.'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to analyze images. Please try again.'
    });
  }
});

/**
 * POST /api/ai/enhance-prompt
 * Enhance a prompt using GPT-5 (used for generating with existing models)
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

    const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-5-nano-2025-08-07";

    let response;
    try {
      response = await openai.chat.completions.create({
        model: chatModel,
      messages: [
        {
          role: "system",
          content: "You create detailed image generation prompts. Combine the base description with the user's request into a cohesive, detailed prompt."
        },
        {
          role: "user",
          content: `Base character description: ${basePrompt}

User wants: ${userInput}

Create a detailed image generation prompt that maintains the character's core appearance while incorporating the user's request. Be specific and descriptive.`
        }
      ],
      max_tokens: 300
      });
    } catch (modelError) {
      // If GPT-5 fails, fallback to GPT-4o
      if (modelError.status === 404 || modelError.message?.includes('model') || modelError.message?.includes('gpt-5')) {
        console.log(`⚠️ ${chatModel} not available, falling back to gpt-4o...`);

        response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You create detailed image generation prompts. Combine the base description with the user's request into a cohesive, detailed prompt."
            },
            {
              role: "user",
              content: `Base character description: ${basePrompt}

User wants: ${userInput}

Create a detailed image generation prompt that maintains the character's core appearance while incorporating the user's request. Be specific and descriptive.`
            }
          ],
          max_tokens: 300
        });
      } else {
        throw modelError;
      }
    }

    const enhancedPrompt = response.choices[0].message.content;

    res.json({
      success: true,
      enhancedPrompt: enhancedPrompt
    });

  } catch (error) {
    console.error('Error enhancing prompt:', error);
    res.status(500).json({
      error: error.message || 'Failed to enhance prompt'
    });
  }
});

module.exports = router;
