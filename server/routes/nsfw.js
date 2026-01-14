const express = require('express');
const router = express.Router();
const { checkAndDeductForGeneration, getUserProfile } = require('../services/creditService');
const supabase = require('../config/supabase');

const WAVESPEED_API_KEY = 'c4fdc8705e394ffde2ca14458a8fc00ab41086c7a3281a717c5bb134b5cd6bac';
const WAVESPEED_API_URL = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v4/edit';

/**
 * Poll the Wavespeed API for result
 */
async function pollForResult(resultUrl, maxAttempts = 60, interval = 2000) {
  console.log('Starting to poll for result at:', resultUrl);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(resultUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`);
      }

      const resultData = await response.json();
      const data = resultData.data || resultData;

      console.log(`Poll attempt ${attempt + 1}: status = ${data.status}`);

      // Check if processing is complete
      if (data.status === 'completed' || data.status === 'succeeded') {
        // Check for outputs array
        if (data.outputs && Array.isArray(data.outputs) && data.outputs.length > 0) {
          const output = data.outputs[0];
          if (typeof output === 'string') {
            console.log('Found image URL in outputs:', output);
            return output;
          }
          if (output.url || output.image_url) {
            console.log('Found image URL in output object:', output.url || output.image_url);
            return output.url || output.image_url;
          }
        }

        // Check for direct image URL
        if (data.image_url || data.url) {
          console.log('Found direct image URL:', data.image_url || data.url);
          return data.image_url || data.url;
        }

        // Check for result property
        if (data.result) {
          if (typeof data.result === 'string') {
            return data.result;
          }
          if (data.result.url || data.result.image_url) {
            return data.result.url || data.result.image_url;
          }
        }

        console.error('Status is completed but no image URL found. Data:', data);
        throw new Error('Image generation completed but no image URL found in response');
      }

      // Check if processing failed
      if (data.status === 'failed' || data.status === 'error') {
        throw new Error(data.error || 'Image generation failed');
      }

      // If still processing, wait and try again
      if (data.status === 'created' || data.status === 'processing' || data.status === 'starting') {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      // Unknown status
      console.log('Unknown status:', data.status);
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw new Error('Polling timeout: Image generation took too long');
}

/**
 * POST /api/nsfw/generate
 * Generate NSFW image with proper credit deduction
 */
router.post('/generate', async (req, res) => {
  try {
    const { imageUrl, prompt, userId, modelId } = req.body;

    if (!imageUrl || !prompt || !userId) {
      return res.status(400).json({
        error: 'imageUrl, prompt, and userId are required'
      });
    }

    console.log('\n💰 === NSFW GENERATION WITH CREDIT DEDUCTION ===');
    console.log(`User ID: ${userId}`);
    console.log(`Model ID: ${modelId || 'N/A'}`);
    console.log(`Prompt: "${prompt}"`);

    // Check and deduct credits BEFORE calling Wavespeed API
    try {
      const creditResult = await checkAndDeductForGeneration(userId, true, {
        // isNsfw = true, so cost will be 30 (Essential) or 15 (Ultimate)
        batch: false // Single image
      });

      console.log(`✅ Credits deducted: ${creditResult.cost}, Remaining: ${creditResult.remainingCredits}`);
    } catch (creditError) {
      console.error('❌ Credit deduction failed:', creditError.message);
      return res.status(402).json({
        error: creditError.message || 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS'
      });
    }

    // Now call Wavespeed API
    console.log('🎨 Calling Wavespeed API...');

    try {
      const response = await fetch(WAVESPEED_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`
        },
        body: JSON.stringify({
          enable_base64_output: false,
          enable_sync_mode: false,
          images: [imageUrl],
          prompt: prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Wavespeed API error:', errorData);

        // TODO: Refund credits since generation failed
        // For now, just throw error
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Wavespeed API initial response:', responseData);

      const data = responseData.data || responseData;

      // Check if we have a result URL to poll
      if (data.urls && data.urls.get) {
        console.log('Polling for result at:', data.urls.get);
        const resultImageUrl = await pollForResult(data.urls.get);

        console.log('✅ NSFW image generated successfully');
        console.log('💰 === CREDIT DEDUCTION COMPLETE ===\n');

        return res.json({
          success: true,
          imageUrl: resultImageUrl
        });
      }

      // If status is already completed, check outputs
      if (data.status === 'completed' || data.status === 'succeeded') {
        if (data.outputs && Array.isArray(data.outputs) && data.outputs.length > 0) {
          const output = data.outputs[0];
          const resultImageUrl = typeof output === 'string' ? output : (output.url || output.image_url);

          console.log('✅ NSFW image generated successfully');
          console.log('💰 === CREDIT DEDUCTION COMPLETE ===\n');

          return res.json({
            success: true,
            imageUrl: resultImageUrl
          });
        }
      }

      throw new Error('Unexpected response format. No result URL found for polling.');
    } catch (wavespeedError) {
      console.error('❌ Wavespeed generation error:', wavespeedError.message);

      // TODO: Implement credit refund logic here
      // For now, credits are lost if generation fails

      return res.status(500).json({
        error: wavespeedError.message || 'Failed to generate NSFW image',
        code: 'GENERATION_FAILED'
      });
    }
  } catch (error) {
    console.error('❌ Error in NSFW generation:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate NSFW image'
    });
  }
});

module.exports = router;
