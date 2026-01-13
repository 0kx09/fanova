const axios = require('axios');

/**
 * Analyze reference images using OpenAI Vision API
 * Extracts facial features and attributes from uploaded images
 */
async function analyzeReferenceImages(imageBase64Array) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    // Prepare content array with images for OpenAI
    const content = [
      {
        type: "text",
        text: `Analyze these ${imageBase64Array.length} reference photos of the same person and extract detailed physical characteristics for AI image generation.

Provide ONLY a JSON response (no other text) with this exact structure:
{
  "gender": "female/male/non-binary",
  "age": estimated age (number),
  "hairColor": "specific color (e.g., dark brown, platinum blonde, auburn, black)",
  "hairStyle": "texture (straight/wavy/curly/coily/braided)",
  "hairLength": "short/medium/long/very-long",
  "eyeColor": "brown/blue/green/hazel/gray/amber",
  "skinTone": "white/black/mixed/brown/asian/latino/middle-eastern",
  "faceShape": "oval/round/heart/square/diamond/oblong",
  "eyeShape": "almond/round/hooded/monolid/upturned/downturned",
  "noseShape": "straight/button/roman/aquiline/wide/narrow",
  "lipShape": "full/thin/bow-shaped/wide/heart-shaped",
  "bodyType": "slim/athletic/average/curvy/plus-size",
  "distinctiveFeatures": "any notable features like freckles, dimples, etc.",
  "ethnicity": "apparent ethnicity if identifiable",
  "overallDescription": "A comprehensive 2-3 sentence description suitable for AI image generation"
}

Be very specific and detailed. This will be used to generate highly accurate AI images that match this person's appearance.`
      }
    ];

    // Add all images to the content array
    imageBase64Array.forEach(base64Data => {
      content.push({
        type: "image_url",
        image_url: {
          url: base64Data,
          detail: "high"
        }
      });
    });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // Extract the analysis from OpenAI response
    if (response.data.choices && response.data.choices[0]) {
      const messageContent = response.data.choices[0].message.content;
      console.log('OpenAI raw response:', messageContent);

      // Try to parse JSON from the response
      try {
        // First try direct JSON parse
        const analysis = JSON.parse(messageContent);
        console.log('OpenAI image analysis complete:', analysis);
        return analysis;
      } catch (e) {
        // If that fails, try to extract JSON with regex
        const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          console.log('OpenAI image analysis complete (regex):', analysis);
          return analysis;
        }
      }
    }

    console.error('Full OpenAI response:', JSON.stringify(response.data, null, 2));
    throw new Error('Failed to extract analysis from OpenAI response');
  } catch (error) {
    console.error('Image analysis error:', error.response?.data || error.message);
    throw new Error('Failed to analyze reference images: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Generate a detailed prompt from analyzed image features
 */
function generatePromptFromAnalysis(analysis, additionalAttributes = {}) {
  let promptParts = [];

  // Critical iPhone selfie characteristics
  promptParts.push('iPhone selfie photo');
  promptParts.push('taken with iPhone 15 Pro front camera');
  promptParts.push('vertical 9:16 portrait orientation');
  promptParts.push('person holding phone at arms length');
  promptParts.push('slight upward angle');

  // Subject from analysis
  if (analysis.age && analysis.gender) {
    promptParts.push(`${analysis.age} year old ${analysis.gender}`);
  }

  // Ethnicity if specified
  if (analysis.ethnicity) {
    promptParts.push(`${analysis.ethnicity} ethnicity`);
  }

  // Hair from analysis
  if (analysis.hairLength || analysis.hairStyle || analysis.hairColor) {
    const hairParts = [];
    if (analysis.hairLength) hairParts.push(analysis.hairLength);
    if (analysis.hairStyle) hairParts.push(analysis.hairStyle);
    if (analysis.hairColor) hairParts.push(analysis.hairColor);
    promptParts.push(`with ${hairParts.join(' ')} hair`);
  }

  // Eyes
  if (analysis.eyeColor) {
    promptParts.push(`${analysis.eyeColor} eyes`);
  }

  // Skin tone
  if (analysis.skinTone) {
    promptParts.push(`${analysis.skinTone} skin`);
  }

  // Body type
  if (analysis.bodyType) {
    promptParts.push(`${analysis.bodyType} body type`);
  }

  // Facial features
  if (analysis.faceShape) {
    promptParts.push(`${analysis.faceShape}-shaped face`);
  }

  if (analysis.eyeShape) {
    promptParts.push(`${analysis.eyeShape}-shaped eyes`);
  }

  if (analysis.noseShape) {
    promptParts.push(`${analysis.noseShape} nose`);
  }

  if (analysis.lipShape) {
    promptParts.push(`${analysis.lipShape} lips`);
  }

  // Distinctive features
  if (analysis.distinctiveFeatures) {
    promptParts.push(analysis.distinctiveFeatures);
  }

  // Style from additional attributes
  if (additionalAttributes.style) {
    promptParts.push(`wearing ${additionalAttributes.style} outfit`);
  } else {
    promptParts.push('wearing casual modern clothing');
  }

  // Expression
  promptParts.push('natural friendly expression');

  // Lighting
  promptParts.push('soft natural lighting');
  promptParts.push('well-lit face');

  // iPhone characteristics
  promptParts.push('shot with iPhone front camera');
  promptParts.push('face in sharp focus');
  promptParts.push('accurate skin tones');
  promptParts.push('realistic iPhone color science');

  // Composition
  promptParts.push('centered composition');
  promptParts.push('head and shoulders visible');
  promptParts.push('face taking up 40% of frame');

  // Background
  promptParts.push('simple indoor background');
  promptParts.push('casual home environment');

  // Technical quality
  promptParts.push('HDR processing');
  promptParts.push('Smart HDR 5');
  promptParts.push('computational photography');
  promptParts.push('ultra realistic');
  promptParts.push('photorealistic');
  promptParts.push('looks like real person');

  return promptParts.join(', ');
}

module.exports = {
  analyzeReferenceImages,
  generatePromptFromAnalysis
};
