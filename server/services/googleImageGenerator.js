const axios = require('axios');

/**
 * Generate images using Google Imagen API
 * API docs: https://ai.google.dev/api/generate-image
 */
async function generateWithGoogleImagen(prompt, negativePrompt, numImages = 3) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  try {
    const images = [];

    // Google Imagen generates one image at a time
    for (let i = 0; i < numImages; i++) {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GOOGLE_API_KEY}`,
        {
          instances: [
            {
              prompt: prompt
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            negativePrompt: negativePrompt,
            safetySetting: 'block_some',
            personGeneration: 'allow_all'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract image from response
      if (response.data.predictions && response.data.predictions[0]) {
        const imageData = response.data.predictions[0].bytesBase64Encoded;

        // Convert base64 to data URL
        const imageUrl = `data:image/png;base64,${imageData}`;
        images.push(imageUrl);
      }
    }

    return images;
  } catch (error) {
    console.error('Google Imagen generation error:', error.response?.data || error.message);
    throw new Error('Failed to generate images with Google Imagen');
  }
}

module.exports = {
  generateWithGoogleImagen
};
