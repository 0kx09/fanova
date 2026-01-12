/**
 * Credit Service for Backend
 * Handles credit checking and deduction on the server side
 */

const supabase = require('../config/supabase');

// Credit costs
const STANDARD_IMAGE_COST = 10;
const MODEL_CREATION_COST = 50;
const MODEL_RETRAINING_COST = 25;

// NSFW costs by plan
const NSFW_COSTS = {
  essential: 30,
  ultimate: 15
};

/**
 * Get user profile with credits and subscription
 */
async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('credits, subscription_plan')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get user profile: ${error.message}`);
  }

  return {
    credits: data?.credits ?? 0,
    subscription_plan: data?.subscription_plan ?? null // Return null instead of 'base'
  };
}

/**
 * Count how many images a user has generated (for free image tracking)
 */
async function countUserGeneratedImages(userId) {
  // First, get all models for this user
  const { data: models, error: modelsError } = await supabase
    .from('models')
    .select('id')
    .eq('user_id', userId);

  if (modelsError) {
    console.error('Error fetching user models:', modelsError);
    return 0;
  }

  if (!models || models.length === 0) {
    return 0;
  }

  const modelIds = models.map(m => m.id);

  // Count generated images for these models
  const { count, error: imageError } = await supabase
    .from('generated_images')
    .select('*', { count: 'exact', head: true })
    .in('model_id', modelIds);

  if (imageError) {
    console.error('Error counting user images:', imageError);
    return 0;
  }

  return count ?? 0;
}

/**
 * Check if user has enough credits
 */
async function checkCredits(userId, cost) {
  const profile = await getUserProfile(userId);
  
  if (profile.credits < cost) {
    return {
      hasCredits: false,
      currentCredits: profile.credits,
      requiredCredits: cost,
      error: `Insufficient credits. You need ${cost} credits but only have ${profile.credits}.`
    };
  }

  return {
    hasCredits: true,
    currentCredits: profile.credits,
    requiredCredits: cost,
    remainingCredits: profile.credits - cost
  };
}

/**
 * Calculate image generation cost
 */
function calculateImageCost(planType, isNsfw = false, options = {}) {
  // Batch generation: 25 credits total for 3 images
  if (options.batch) {
    return 25;
  }

  let cost = STANDARD_IMAGE_COST;

  // NSFW images have different costs
  if (isNsfw) {
    if (!NSFW_COSTS[planType]) {
      throw new Error('NSFW images not available on this plan');
    }
    cost = NSFW_COSTS[planType];
  }

  // Add optional add-ons
  if (options.highResolution) {
    cost += 5;
  }
  if (options.priority) {
    cost += 5;
  }

  return cost;
}

/**
 * Deduct credits from user account
 */
async function deductCredits(userId, amount, transactionType = 'generation', description = null, metadata = {}) {
  // Get current credits
  const profile = await getUserProfile(userId);
  
  if (profile.credits < amount) {
    throw new Error('Insufficient credits');
  }

  const newCredits = profile.credits - amount;

  // Update credits
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to deduct credits: ${updateError.message}`);
  }

  // Log transaction
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      transaction_type: transactionType,
      description: description || `Credits deducted for ${transactionType}`,
      metadata: metadata
    });

  if (transactionError) {
    console.error('Error logging credit transaction:', transactionError);
    // Don't throw - credits were already deducted
  }

  return newCredits;
}

/**
 * Check and deduct credits for image generation
 * Allows first 3 images free for users with no plan
 */
async function checkAndDeductForGeneration(userId, isNsfw = false, options = {}) {
  const profile = await getUserProfile(userId);
  
  // Check if user has no plan (subscription_plan is null)
  const hasNoPlan = !profile.subscription_plan;
  let isFree = false;
  let actualCost = 0;

  if (hasNoPlan && !isNsfw) {
    // Count how many images the user has generated
    const imageCount = await countUserGeneratedImages(userId);
    
    // First 3 images are free (for initial model creation)
    if (imageCount < 3) {
      isFree = true;
      actualCost = 0;
      console.log(`User ${userId} has ${imageCount} images, allowing free generation (${3 - imageCount} remaining)`);
    } else {
      // After 3 free images, they need a subscription
      throw new Error('You have used your 3 free images. Please subscribe to a plan to continue generating images.');
    }
  } else {
    // User has a plan or requesting NSFW (which requires a plan)
    if (hasNoPlan && isNsfw) {
      throw new Error('NSFW images require a subscription plan. Please subscribe to Essential or Ultimate plan.');
    }
    
    actualCost = calculateImageCost(profile.subscription_plan, isNsfw, options);
    
    // Check credits
    const creditCheck = await checkCredits(userId, actualCost);
    if (!creditCheck.hasCredits) {
      throw new Error(creditCheck.error);
    }
  }

  // Deduct credits (or skip if free)
  let remainingCredits = profile.credits;
  if (!isFree && actualCost > 0) {
    remainingCredits = await deductCredits(
      userId,
      actualCost,
      'generation',
      `Image generation${isNsfw ? ' (NSFW)' : ''}${options.batch ? ' (Batch)' : ''}`,
      {
        plan: profile.subscription_plan,
        isNsfw,
        options
      }
    );
  } else if (isFree) {
    // Log free generation transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 0,
        transaction_type: 'generation',
        description: 'Free image generation (first 3 images)',
        metadata: { isFree: true, plan: null }
      });

    if (transactionError) {
      console.error('Error logging free generation transaction:', transactionError);
    }
  }

  return {
    success: true,
    cost: actualCost,
    remainingCredits,
    isFree
  };
}

/**
 * Check and deduct credits for model creation
 */
async function checkAndDeductForModelCreation(userId) {
  const creditCheck = await checkCredits(userId, MODEL_CREATION_COST);
  if (!creditCheck.hasCredits) {
    throw new Error(creditCheck.error);
  }

  const remainingCredits = await deductCredits(
    userId,
    MODEL_CREATION_COST,
    'generation',
    'Model creation',
    { type: 'model_creation' }
  );

  return {
    success: true,
    cost: MODEL_CREATION_COST,
    remainingCredits
  };
}

module.exports = {
  getUserProfile,
  checkCredits,
  calculateImageCost,
  deductCredits,
  checkAndDeductForGeneration,
  checkAndDeductForModelCreation,
  countUserGeneratedImages,
  STANDARD_IMAGE_COST,
  MODEL_CREATION_COST,
  MODEL_RETRAINING_COST
};
