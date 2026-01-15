const axios = require('axios');

/**
 * Generate images using Fal.ai API (Flux Pro or similar model)
 * Supports image-to-image generation with referenceImageUrl for consistency
 */
async function generateWithFalAi(prompt, negativePrompt, numImages = 3, referenceImageUrl = null) {
  const FAL_AI_KEY = process.env.FAL_AI_KEY;

  if (!FAL_AI_KEY) {
    throw new Error('FAL_AI_KEY not configured');
  }

  try {
    const requestBody = {
      prompt: prompt,
      negative_prompt: negativePrompt,
      num_images: numImages,
      image_size: {
        width: 768,
        height: 1024
      },
      num_inference_steps: 28,
      guidance_scale: 3.5,
      enable_safety_checker: true,
      // Add seed variation for more natural results
      seed: Math.floor(Math.random() * 1000000)
    };

    // Add image-to-image support if reference image is provided
    if (referenceImageUrl) {
      requestBody.image_url = referenceImageUrl;
      requestBody.strength = 0.6; // Balance between reference and new prompt (0.0-1.0)
      console.log('🎨 Using image-to-image generation for consistency');
    }

    const response = await axios.post(
      'https://fal.run/fal-ai/flux-pro',
      requestBody,
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
 * Retry helper with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error.response?.status === 503 ||
                          error.response?.data?.error?.status === 'UNAVAILABLE' ||
                          error.code === 'ECONNRESET' ||
                          error.code === 'ETIMEDOUT';

      const isLastAttempt = attempt === maxRetries - 1;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms (Error: ${error.response?.status || error.message})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Generate images using Google Gemini 3 Pro Image API (Nano Banana Pro)
 * WITH RETRY LOGIC for rate limiting and overload errors
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
      // Wrap each image generation in retry logic
      const imageUrl = await retryWithBackoff(async () => {
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
            },
            timeout: 60000 // 60 second timeout
          }
        );

        // Extract image from response (base64 encoded in parts)
        if (response.data.candidates && response.data.candidates[0]) {
          const parts = response.data.candidates[0].content.parts;

          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              return `data:${mimeType};base64,${part.inlineData.data}`;
            }
          }
        }

        throw new Error('No image data in response');
      }, 3, 2000); // 3 retries with 2 second base delay

      images.push(imageUrl);
      console.log(`✅ Generated image ${i + 1}/${numImages}`);

      // Add small delay between requests to avoid rate limiting
      if (i < numImages - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (images.length === 0) {
      throw new Error('No images were generated');
    }

    return images;
  } catch (error) {
    console.error('Google Gemini generation error:', error.response?.data || error.message);

    // Provide more specific error messages
    if (error.response?.status === 503 || error.response?.data?.error?.status === 'UNAVAILABLE') {
      throw new Error('RATE_LIMITED'); // Special error code for fallback
    }

    throw new Error('Failed to generate images with Google Gemini');
  }
}

/**
 * Main image generation function with automatic fallback
 * Priority: Google Imagen → Fal.ai → Replicate
 * Supports referenceImageUrl for consistency (image-to-image)
 *
 * AUTOMATIC FALLBACK: If Google Gemini is rate-limited (503),
 * automatically tries Fal.ai or Replicate instead
 */
async function generateImages(prompt, negativePrompt, numImages = 3, referenceImageUrl = null) {
  const providers = [
    {
      name: 'Google Imagen',
      check: () => process.env.GOOGLE_API_KEY,
      generate: () => generateWithGoogleImagen(prompt, negativePrompt, numImages)
    },
    {
      name: 'Fal.ai',
      check: () => process.env.FAL_AI_KEY,
      generate: () => generateWithFalAi(prompt, negativePrompt, numImages, referenceImageUrl)
    },
    {
      name: 'Replicate',
      check: () => process.env.REPLICATE_API_TOKEN,
      generate: () => generateWithReplicate(prompt, negativePrompt, numImages)
    }
  ];

  // Filter to only available providers
  const availableProviders = providers.filter(p => p.check());

  if (availableProviders.length === 0) {
    throw new Error('No image generation API configured');
  }

  let lastError = null;

  // Try each provider in sequence
  for (const provider of availableProviders) {
    try {
      console.log(`🎨 Generating images with ${provider.name}...`);
      const result = await provider.generate();
      console.log(`✅ Successfully generated ${result.length} images with ${provider.name}`);
      return result;
    } catch (error) {
      lastError = error;

      // Check if this is a rate limit error
      const isRateLimited = error.message === 'RATE_LIMITED' ||
                           error.response?.status === 503 ||
                           error.response?.status === 429;

      if (isRateLimited) {
        console.warn(`⚠️ ${provider.name} is rate-limited or overloaded. Trying next provider...`);
      } else {
        console.error(`❌ ${provider.name} failed:`, error.message);
      }

      // If this is not the last provider, continue to next one
      // Otherwise, throw the error
      const isLastProvider = provider === availableProviders[availableProviders.length - 1];
      if (!isLastProvider) {
        console.log(`🔄 Falling back to next provider...`);
        continue;
      }
    }
  }

  // All providers failed
  console.error('❌ All image generation providers failed');
  throw new Error(
    lastError?.message || 'All image generation services are currently unavailable. Please try again later.'
  );
}

module.exports = {
  generateImages,
  generateWithGoogleImagen,
  generateWithFalAi,
  generateWithReplicate
};
