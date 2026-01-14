/**
 * Pricing and Credits Service
 * Handles subscription plans, credit costs, and pricing calculations
 */

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  base: {
    name: 'Base Plan',
    price: 0,
    currency: 'GBP',
    monthlyCredits: 10,
    nsfwCost: null, // Not available on base plan
    hasWatermark: true,
    support: 'Standard',
    generationSpeed: 'Standard',
    features: ['Free forever', 'Basic AI model creation', 'Watermarked images', 'Standard generation speed', '1 SFW image per month (10 credits)']
  },
  essential: {
    name: 'Essential Plan',
    price: 19.99,
    currency: 'GBP',
    monthlyCredits: 250,
    nsfwCost: 30,
    hasWatermark: false,
    support: '24/7',
    generationSpeed: 'Faster',
    features: ['No watermarks', '24/7 customer support', 'Faster generation', 'NSFW images (30 credits)', '25 SFW images per month', 'Full model customization']
  },
  ultimate: {
    name: 'Ultimate Plan',
    price: 29.99,
    currency: 'GBP',
    monthlyCredits: 500,
    nsfwCost: 15,
    hasWatermark: false,
    support: 'Priority 24/7',
    generationSpeed: 'Fastest',
    trialDays: 1, // 1 day free trial
    features: ['No watermarks', 'Priority 24/7 support', 'Fastest generation', 'NSFW images (15 credits)', '50 SFW images per month', 'Advanced features', 'Best value per credit', '1 day free trial']
  }
};

// Credit Recharge Options
export const CREDIT_RECHARGES = [
  { id: 'recharge-50', credits: 50, price: 4.99, currency: 'GBP' },
  { id: 'recharge-100', credits: 100, price: 9.99, currency: 'GBP' },
  { id: 'recharge-250', credits: 250, price: 19.99, currency: 'GBP' }
];

// Standard SFW image generation cost (same for all plans)
export const STANDARD_IMAGE_COST = 10;

// Model creation and training costs
export const MODEL_CREATION_COST = 50; // One-time cost for initial model creation
export const MODEL_RETRAINING_COST = 25; // Cost for model updates/retraining

// Optional add-on costs
export const ADDON_COSTS = {
  highResolution: 5, // +5 credits for high-resolution output
  priorityGeneration: 5, // +5 credits for priority generation
  batchGeneration: 25 // 25 credits total for batch (3 images)
};

/**
 * Get credit cost for generating an image
 * @param {string} planType - User's subscription plan ('base', 'essential', 'ultimate')
 * @param {boolean} isNsfw - Whether the image is NSFW
 * @param {object} options - Optional add-ons
 * @param {boolean} options.highResolution - High-resolution output (+5 credits)
 * @param {boolean} options.priority - Priority generation (+5 credits)
 * @param {boolean} options.batch - Batch generation (3 images for 25 credits total)
 * @returns {number} - Credit cost
 */
export const getImageGenerationCost = (planType, isNsfw = false, options = {}) => {
  // Users with no plan get first 3 images free (handled on backend)
  // This function is for display purposes - actual free check happens on backend
  if (!planType || planType === null) {
    if (isNsfw) {
      throw new Error('NSFW images require a subscription plan');
    }
    // Frontend will show cost, but backend will allow first 3 free
    return STANDARD_IMAGE_COST;
  }

  let baseCost = STANDARD_IMAGE_COST;

  // NSFW images have different costs based on plan
  if (isNsfw) {
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan || !plan.nsfwCost) {
      throw new Error('NSFW images not available on this plan');
    }
    baseCost = plan.nsfwCost;
  }

  // Batch generation: 25 credits total for 3 images (overrides base cost)
  if (options.batch) {
    return ADDON_COSTS.batchGeneration;
  }

  // Add optional add-ons
  let totalCost = baseCost;
  if (options.highResolution) {
    totalCost += ADDON_COSTS.highResolution;
  }
  if (options.priority) {
    totalCost += ADDON_COSTS.priorityGeneration;
  }

  return totalCost;
};

/**
 * Get cost for model creation
 * @returns {number} - Credit cost (50 credits)
 */
export const getModelCreationCost = () => {
  return MODEL_CREATION_COST;
};

/**
 * Get cost for model retraining
 * @returns {number} - Credit cost (25 credits)
 */
export const getModelRetrainingCost = () => {
  return MODEL_RETRAINING_COST;
};

/**
 * Check if user can generate NSFW images
 * @param {string} planType - User's subscription plan
 * @returns {boolean}
 */
export const canGenerateNsfw = (planType) => {
  if (!planType || planType === null) {
    return false; // No plan = no NSFW
  }
  const plan = SUBSCRIPTION_PLANS[planType];
  return plan && plan.nsfwCost !== null;
};

/**
 * Check if images should have watermark
 * @param {string} planType - User's subscription plan
 * @returns {boolean}
 */
export const shouldAddWatermark = (planType) => {
  const plan = SUBSCRIPTION_PLANS[planType];
  return plan ? plan.hasWatermark : true;
};

/**
 * Get plan details
 * @param {string} planType - Plan type ('base', 'essential', 'ultimate')
 * @returns {object} - Plan details
 */
export const getPlanDetails = (planType) => {
  if (!planType || planType === null) {
    return null; // Return null for no plan
  }
  return SUBSCRIPTION_PLANS[planType] || null;
};

/**
 * Format price for display
 * @param {number} price - Price amount
 * @param {string} currency - Currency code (default: 'GBP')
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price, currency = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
  }).format(price);
};

/**
 * Calculate credits per pound for a plan
 * @param {string} planType - Plan type
 * @returns {number} - Credits per pound (Infinity for free plans)
 */
export const getCreditsPerPound = (planType) => {
  const plan = SUBSCRIPTION_PLANS[planType];
  if (!plan) return 0;
  if (plan.price === 0) return Infinity; // Free plans have infinite value
  return Math.round((plan.monthlyCredits / plan.price) * 100) / 100;
};

/**
 * Get best value plan (most credits per pound)
 * Excludes free plans from calculation
 * @returns {string} - Plan type with best value
 */
export const getBestValuePlan = () => {
  let bestPlan = 'essential';
  let bestValue = 0;

  Object.keys(SUBSCRIPTION_PLANS).forEach(planType => {
    const plan = SUBSCRIPTION_PLANS[planType];
    // Skip free plans
    if (plan.price === 0) return;

    const value = getCreditsPerPound(planType);
    if (value > bestValue) {
      bestValue = value;
      bestPlan = planType;
    }
  });

  return bestPlan;
};
