/**
 * Image Generation Service
 * Handles credit checking and deduction for image generation
 */

import { getImageGenerationCost, canGenerateNsfw, getModelCreationCost, getModelRetrainingCost } from './pricingService';
import { getUserProfile, deductCredits } from './supabaseService';

/**
 * Check if user has enough credits for image generation
 * @param {string} planType - User's subscription plan
 * @param {boolean} isNsfw - Whether generating NSFW image
 * @param {object} options - Optional add-ons
 * @returns {Promise<{hasCredits: boolean, cost: number, currentCredits: number}>}
 */
export const checkCreditsForGeneration = async (isNsfw = false, options = {}) => {
  try {
    const profile = await getUserProfile();
    const { subscription_plan, credits } = profile;

    // Check if NSFW is allowed
    if (isNsfw && !canGenerateNsfw(subscription_plan)) {
      return {
        hasCredits: false,
        cost: 0,
        currentCredits: credits,
        error: 'NSFW images are not available on your current plan. Please upgrade to Essential or Ultimate plan.'
      };
    }

    // For users with no plan, backend will handle free images
    // Frontend just needs to allow the request to go through
    if (!subscription_plan || subscription_plan === null) {
      if (isNsfw) {
        return {
          hasCredits: false,
          cost: 0,
          currentCredits: credits,
          error: 'NSFW images require a subscription plan. Please subscribe to Essential or Ultimate plan.'
        };
      }
      // Backend will check if user has used their 3 free images
      // For now, allow the request (backend will handle the free check)
      return {
        hasCredits: true,
        cost: 0, // Will be free if within first 3 images
        currentCredits: credits,
        remainingCredits: credits
      };
    }

    // Calculate cost for users with a plan
    const cost = getImageGenerationCost(subscription_plan, isNsfw, options);

    // Check if user has enough credits
    if (credits < cost) {
      return {
        hasCredits: false,
        cost,
        currentCredits: credits,
        error: `Insufficient credits. You need ${cost} credits but only have ${credits}.`
      };
    }

    return {
      hasCredits: true,
      cost,
      currentCredits: credits,
      remainingCredits: credits - cost
    };
  } catch (error) {
    console.error('Error checking credits:', error);
    throw error;
  }
};

/**
 * Deduct credits for image generation
 * @param {boolean} isNsfw - Whether generating NSFW image
 * @param {object} options - Optional add-ons
 * @param {string} modelId - Model ID for transaction logging
 * @returns {Promise<{success: boolean, remainingCredits: number, cost: number}>}
 */
export const deductCreditsForGeneration = async (isNsfw = false, options = {}, modelId = null) => {
  try {
    const profile = await getUserProfile();
    const { subscription_plan } = profile;

    // Calculate cost
    const cost = getImageGenerationCost(subscription_plan, isNsfw, options);

    // Deduct credits
    const remainingCredits = await deductCredits(
      cost,
      'generation',
      `Image generation${isNsfw ? ' (NSFW)' : ''}${options.batch ? ' (Batch)' : ''}${options.highResolution ? ' (High-res)' : ''}${options.priority ? ' (Priority)' : ''}`,
      {
        plan: subscription_plan,
        isNsfw,
        modelId,
        options
      }
    );

    return {
      success: true,
      remainingCredits,
      cost
    };
  } catch (error) {
    console.error('Error deducting credits:', error);
    throw error;
  }
};

/**
 * Check if user has enough credits for model creation
 * @returns {Promise<{hasCredits: boolean, cost: number, currentCredits: number}>}
 */
export const checkCreditsForModelCreation = async () => {
  try {
    const profile = await getUserProfile();
    const { credits } = profile;
    const cost = getModelCreationCost();

    if (credits < cost) {
      return {
        hasCredits: false,
        cost,
        currentCredits: credits,
        error: `Insufficient credits. Model creation costs ${cost} credits but you only have ${credits}.`
      };
    }

    return {
      hasCredits: true,
      cost,
      currentCredits: credits,
      remainingCredits: credits - cost
    };
  } catch (error) {
    console.error('Error checking credits for model creation:', error);
    throw error;
  }
};

/**
 * Deduct credits for model creation
 * @returns {Promise<{success: boolean, remainingCredits: number}>}
 */
export const deductCreditsForModelCreation = async () => {
  try {
    const cost = getModelCreationCost();
    const remainingCredits = await deductCredits(
      cost,
      'generation',
      'Model creation',
      { type: 'model_creation' }
    );

    return {
      success: true,
      remainingCredits
    };
  } catch (error) {
    console.error('Error deducting credits for model creation:', error);
    throw error;
  }
};

/**
 * Check if user has enough credits for model retraining
 * @returns {Promise<{hasCredits: boolean, cost: number, currentCredits: number}>}
 */
export const checkCreditsForModelRetraining = async () => {
  try {
    const profile = await getUserProfile();
    const { credits } = profile;
    const cost = getModelRetrainingCost();

    if (credits < cost) {
      return {
        hasCredits: false,
        cost,
        currentCredits: credits,
        error: `Insufficient credits. Model retraining costs ${cost} credits but you only have ${credits}.`
      };
    }

    return {
      hasCredits: true,
      cost,
      currentCredits: credits,
      remainingCredits: credits - cost
    };
  } catch (error) {
    console.error('Error checking credits for model retraining:', error);
    throw error;
  }
};

/**
 * Deduct credits for model retraining
 * @param {string} modelId - Model ID being retrained
 * @returns {Promise<{success: boolean, remainingCredits: number}>}
 */
export const deductCreditsForModelRetraining = async (modelId) => {
  try {
    const cost = getModelRetrainingCost();
    const remainingCredits = await deductCredits(
      cost,
      'generation',
      'Model retraining',
      { type: 'model_retraining', modelId }
    );

    return {
      success: true,
      remainingCredits
    };
  } catch (error) {
    console.error('Error deducting credits for model retraining:', error);
    throw error;
  }
};
