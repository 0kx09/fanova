const axios = require('axios');

/**
 * Generate images using Fal.ai API (Flux Pro or similar model)
 */
async function generateWithFalAi(prompt, negativePrompt, numImages = 3) {
  const FAL_AI_KEY = process.env.FAL_AI_KEY;

  if (!FAL_AI_KEY) {
    throw new Error('FAL_AI_KEY not configured');
  }

  try {
    const response = await axios.post(
      'https://fal.run/fal-ai/flux-pro',
      {
        prompt: prompt,
        negative_prompt: negativePrompt,
        num_images: numImages,
        image_size: {
          width: 768,
          height: 1024
        },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: true
      },
      {
        headers: {
          'Authorization': `Key ${FAL_AI_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.images.map(img => img.url);
  } catch (error) {
    console.error('Fal.ai generation error:', error.response?.data || error.message);
    throw new Error('Failed to generate images with Fal.ai');
  }
}

/**
 * Generate images using Replicate API (Alternative)
 */
async function generateWithReplicate(prompt, negativePrompt, numImages = 3) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  try {
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'stability-ai/sdxl:latest',
        input: {
          prompt: prompt,
          negative_prompt: negativePrompt,
          num_outputs: numImages,
          width: 768,
          height: 1024,
          scheduler: 'DPMSolverMultistep',
          num_inference_steps: 50,
          guidance_scale: 7.5
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Poll for results
    let predictionId = response.data.id;
    let maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`
          }
        }
      );

      if (statusResponse.data.status === 'succeeded') {
        return statusResponse.data.output;
      }

      if (statusResponse.data.status === 'failed') {
        throw new Error('Image generation failed');
      }

      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Image generation timeout');
  } catch (error) {
    console.error('Replicate generation error:', error.response?.data || error.message);
    throw new Error('Failed to generate images with Replicate');
  }
}

/**
 * Generate images using Google Gemini 3 Pro Image API (Nano Banana Pro)
 */
async function generateWithGoogleImagen(prompt, negativePrompt, numImages = 3) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  try {
    const images = [];

    // Gemini 3 Pro Image generates one image at a time
    for (let i = 0; i < numImages; i++) {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt + (negativePrompt ? `\n\nAvoid: ${negativePrompt}` : '')
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio: '9:16',
              imageSize: '2K'
            }
          }
        },
        {
          headers: {
            'x-goog-api-key': GOOGLE_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract image from response (base64 encoded in parts)
      if (response.data.candidates && response.data.candidates[0]) {
        const parts = response.data.candidates[0].content.parts;

        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            images.push(imageUrl);
            break; // Only take first image from this generation
          }
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No images were generated');
    }

    return images;
  } catch (error) {
    console.error('Google Gemini generation error:', error.response?.data || error.message);
    throw new Error('Failed to generate images with Google Gemini');
  }
}

/**
 * Main image generation function
 * Priority: Google Imagen → Fal.ai → Replicate
 */
async function generateImages(prompt, negativePrompt, numImages = 3) {
  try {
    // Try Google Imagen first (easiest to get API key)
    if (process.env.GOOGLE_API_KEY) {
      console.log('Generating images with Google Imagen...');
      return await generateWithGoogleImagen(prompt, negativePrompt, numImages);
    }

    // Try Fal.ai
    if (process.env.FAL_AI_KEY) {
      console.log('Generating images with Fal.ai...');
      return await generateWithFalAi(prompt, negativePrompt, numImages);
    }

    // Fallback to Replicate
    if (process.env.REPLICATE_API_TOKEN) {
      console.log('Generating images with Replicate...');
      return await generateWithReplicate(prompt, negativePrompt, numImages);
    }

    throw new Error('No image generation API configured');
  } catch (error) {
    console.error('Image generation error:', error.message);
    throw error;
  }
}

module.exports = {
  generateImages,
  generateWithGoogleImagen,
  generateWithFalAi,
  generateWithReplicate
};
