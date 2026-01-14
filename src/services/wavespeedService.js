/**
 * Wavespeed API Service for NSFW image generation/editing
 * Uses ByteDance Seedream-v4 model
 */

import { supabase } from '../lib/supabase';

const WAVESPEED_API_KEY = 'c4fdc8705e394ffde2ca14458a8fc00ab41086c7a3281a717c5bb134b5cd6bac';
const WAVESPEED_API_URL = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v4/edit';

/**
 * Upload image to Supabase Storage and get public URL
 * @param {string|File} imageInput - Image URL (blob/data) or File object
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
const uploadImageToPublicUrl = async (imageInput) => {
  // If it's already a public HTTP/HTTPS URL, return it
  if (typeof imageInput === 'string' && (imageInput.startsWith('http://') || imageInput.startsWith('https://'))) {
    return imageInput;
  }

  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('User not authenticated:', sessionError);
      // Fallback to data URL if not authenticated
      if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
        console.warn('User not authenticated. Using data URL as fallback. API may reject it.');
        return imageInput;
      }
      throw new Error('User must be authenticated to upload images');
    }

    // Convert to blob if it's a data URL
    let blob;
    if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
      const response = await fetch(imageInput);
      blob = await response.blob();
    } else if (imageInput instanceof File) {
      blob = imageInput;
    } else {
      throw new Error('Invalid image input. Expected URL string, data URL, or File object.');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `nsfw-temp/${timestamp}-${randomStr}.${fileExt}`;

    console.log('Uploading to Supabase Storage:', fileName);
    console.log('User authenticated:', session.user.email);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, blob, {
        contentType: blob.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      console.error('Error details:', JSON.stringify(uploadError, null, 2));
      // Fallback: try to use data URL directly (API might accept it)
      if (typeof imageInput === 'string') {
        console.warn('Using data URL as fallback. API may reject it.');
        return imageInput;
      }
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(uploadData.path);

    console.log('Image uploaded to Supabase:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    // Fallback: try to use data URL directly if available
    if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
      console.warn('Using data URL as fallback. API may reject it.');
      return imageInput;
    }
    throw error;
  }
};

/**
 * Poll the Wavespeed API for result
 * @param {string} resultUrl - URL to poll for results
 * @param {number} maxAttempts - Maximum number of polling attempts
 * @param {number} interval - Polling interval in milliseconds
 * @returns {Promise<string>} - URL of the generated image
 */
const pollForResult = async (resultUrl, maxAttempts = 60, interval = 2000) => {
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
};

/**
 * Generate/Edit NSFW image using backend endpoint (which handles credit deduction)
 * @param {string|File} imageInput - URL of the image to edit (or File/blob)
 * @param {string} prompt - Prompt describing the desired changes
 * @returns {Promise<string>} - URL of the generated image
 */
export const generateNSFWImage = async (imageInput, prompt) => {
  try {
    // First, upload image to get a public URL
    console.log('Uploading image to get public URL...');
    const imageUrl = await uploadImageToPublicUrl(imageInput);
    console.log('Using image URL:', imageUrl);

    // Get user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Call backend endpoint which handles credit deduction
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_BASE_URL}/nsfw/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl,
        prompt,
        userId: user.id
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

      // Handle insufficient credits error
      if (errorData.code === 'INSUFFICIENT_CREDITS') {
        throw new Error(errorData.error || 'Insufficient credits. Please subscribe to a plan or purchase more credits.');
      }

      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('NSFW generation response:', responseData);

    if (!responseData.success || !responseData.imageUrl) {
      throw new Error('Failed to generate NSFW image');
    }

    return responseData.imageUrl;
  } catch (error) {
    console.error('NSFW generation error:', error);
    throw error;
  }
};

/**
 * Upload image file and get URL for use with Wavespeed API
 * This function prepares the image for the API
 */
export const prepareImageForWavespeed = async (imageInput) => {
  return await uploadImageToPublicUrl(imageInput);
};
