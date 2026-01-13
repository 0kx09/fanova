const axios = require('axios');
const supabase = require('../config/supabase');

/**
 * Get existing generated images for a model (prefer selected image)
 */
async function getModelReferenceImages(modelId) {
  try {
    // First, try to get the selected image
    const { data: selectedImage } = await supabase
      .from('generated_images')
      .select('image_url')
      .eq('model_id', modelId)
      .eq('is_selected', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectedImage && selectedImage.image_url) {
      return [selectedImage.image_url];
    }

    // If no selected image, get the most recent generated images (up to 3)
    const { data: recentImages } = await supabase
      .from('generated_images')
      .select('image_url')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentImages && recentImages.length > 0) {
      return recentImages.map(img => img.image_url).filter(url => url);
    }

    return [];
  } catch (error) {
    console.error('Error fetching model reference images:', error);
    return [];
  }
}

/**
 * Convert image URL to base64 for Vision API
 */
async function imageUrlToBase64(imageUrl) {
  try {
    // If it's already a data URL, return as is
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Fetch the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    // Convert to base64
    const base64 = Buffer.from(response.data).toString('base64');
    const mimeType = response.headers['content-type'] || 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Analyze existing model image using OpenAI Vision API to extract consistent features
 */
async function analyzeModelImageForConsistency(imageBase64) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image of a person and extract the key visual characteristics that should be maintained for consistency when generating new images of the same person.

Focus on:
1. Facial features (face shape, eye shape, nose, lips, distinctive features)
2. Hair characteristics (color, style, length, texture)
3. Skin tone and complexion
4. Body type and proportions
5. Overall appearance style

Provide ONLY a JSON response with this structure:
{
  "facialFeatures": {
    "faceShape": "description",
    "eyeShape": "description",
    "noseShape": "description",
    "lipShape": "description",
    "distinctiveFeatures": "any notable features"
  },
  "hair": {
    "color": "specific color",
    "style": "texture/style",
    "length": "length description"
  },
  "skinTone": "tone description",
  "bodyType": "type description",
  "visualStyle": "overall appearance style",
  "consistencyPrompt": "A detailed description of the person's appearance that can be added to prompts to maintain consistency"
}

Be very specific and detailed. This will be used to ensure new generated images look like the same person.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    if (response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content.trim();
      
      // Try to parse JSON
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          console.log('✅ Image consistency analysis complete');
          return analysis;
        }
      } catch (e) {
        console.error('Error parsing consistency analysis:', e);
      }
    }

    return null;
  } catch (error) {
    console.error('Error analyzing image for consistency:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Enhance prompt with visual consistency features from existing images
 */
async function enhancePromptWithVisualConsistency(modelId, basePrompt, modelData) {
  try {
    // Get existing images
    const referenceImageUrls = await getModelReferenceImages(modelId);
    
    if (referenceImageUrls.length === 0) {
      console.log('No reference images found, using base prompt only');
      return basePrompt;
    }

    console.log(`📸 Found ${referenceImageUrls.length} reference image(s) for consistency`);

    // Use the first (best) reference image
    const referenceImageUrl = referenceImageUrls[0];
    
    // Convert to base64
    const imageBase64 = await imageUrlToBase64(referenceImageUrl);
    if (!imageBase64) {
      console.log('Could not convert image to base64, using base prompt');
      return basePrompt;
    }

    // Analyze the image for consistency
    const consistencyAnalysis = await analyzeModelImageForConsistency(imageBase64);
    
    if (!consistencyAnalysis || !consistencyAnalysis.consistencyPrompt) {
      console.log('Could not analyze image for consistency, using base prompt');
      return basePrompt;
    }

    // Enhance the prompt with consistency features
    const enhancedPrompt = `${basePrompt}, ${consistencyAnalysis.consistencyPrompt}, maintaining the exact same facial features, hair characteristics, and overall appearance as shown in the reference`;

    console.log('✅ Enhanced prompt with visual consistency features');
    return enhancedPrompt;
  } catch (error) {
    console.error('Error enhancing prompt with visual consistency:', error);
    // Return base prompt if enhancement fails
    return basePrompt;
  }
}

module.exports = {
  getModelReferenceImages,
  analyzeModelImageForConsistency,
  enhancePromptWithVisualConsistency,
  imageUrlToBase64
};
