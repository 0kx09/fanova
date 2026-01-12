import { supabase } from '../lib/supabase';

/**
 * Create a new model in Supabase
 */
export const createModel = async (modelData) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Parse and validate age
  let ageValue = null;
  if (modelData.age && modelData.age !== '') {
    const parsedAge = parseInt(modelData.age);
    if (!isNaN(parsedAge) && parsedAge >= 18) {
      ageValue = parsedAge;
    } else if (!isNaN(parsedAge) && parsedAge < 18) {
      throw new Error('Age must be 18 or older');
    }
  }

  const { data, error } = await supabase
    .from('models')
    .insert([
      {
        user_id: user.id,
        name: modelData.name,
        age: ageValue,
        height: modelData.height ? parseFloat(modelData.height) : null,
        weight: modelData.weight ? parseFloat(modelData.weight) : null,
        nationality: modelData.nationality || null,
        occupation: modelData.occupation || null,
        generation_method: 'describe' // default for now
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update model attributes
 */
export const updateModelAttributes = async (modelId, attributes) => {
  const { data, error } = await supabase
    .from('models')
    .update({
      attributes: attributes
    })
    .eq('id', modelId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update model facial features
 */
export const updateModelFacialFeatures = async (modelId, facialFeatures) => {
  const { data, error } = await supabase
    .from('models')
    .update({
      facial_features: facialFeatures
    })
    .eq('id', modelId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Save generated images to Supabase
 */
export const saveGeneratedImages = async (modelId, images, prompt) => {
  const imagesToInsert = images.map(imageUrl => ({
    model_id: modelId,
    image_url: imageUrl,
    prompt: prompt,
    is_selected: false
  }));

  const { data, error } = await supabase
    .from('generated_images')
    .insert(imagesToInsert)
    .select();

  if (error) throw error;
  return data;
};

/**
 * Mark an image as selected
 */
export const selectModelImage = async (modelId, imageId) => {
  // First, unselect all images for this model
  await supabase
    .from('generated_images')
    .update({ is_selected: false })
    .eq('model_id', modelId);

  // Then select the chosen image
  const { data, error } = await supabase
    .from('generated_images')
    .update({ is_selected: true })
    .eq('id', imageId)
    .select()
    .single();

  if (error) throw error;

  // Also update the model's selected_image_url
  const { error: modelError } = await supabase
    .from('models')
    .update({ selected_image_url: data.image_url })
    .eq('id', modelId);

  if (modelError) throw modelError;

  return data;
};

/**
 * Get user's models
 */
export const getUserModels = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch models first
  const { data: models, error: modelsError } = await supabase
    .from('models')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (modelsError) throw modelsError;

  // For each model, fetch images separately (with limit to prevent duplicates and performance issues)
  const modelsWithImages = await Promise.all(
    models.map(async (model) => {
      const { data: images, error: imagesError } = await supabase
        .from('generated_images')
        .select('*')
        .eq('model_id', model.id)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to most recent 100

      return {
        ...model,
        generated_images: imagesError ? [] : (images || [])
      };
    })
  );

  return modelsWithImages;
};

/**
 * Get a specific model by ID
 */
export const getModel = async (modelId) => {
  try {
    // First, fetch the model without images to avoid timeout
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (modelError) throw modelError;
    if (!model) throw new Error('Model not found');

    // Then fetch images separately with limit and ordering
    // This prevents timeout when there are many images
    const { data: images, error: imagesError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to most recent 100 images

    // If images fetch fails, still return model with empty array
    const generatedImages = imagesError ? [] : (images || []);

    return {
      ...model,
      generated_images: generatedImages
    };
  } catch (error) {
    console.error('Error fetching model:', error);
    throw error;
  }
};

/**
 * Get the selected model (most recent with a selected image)
 */
export const getSelectedModel = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch model first
  const { data: model, error: modelError } = await supabase
    .from('models')
    .select('*')
    .eq('user_id', user.id)
    .not('selected_image_url', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (modelError) {
    throw modelError;
  }

  if (!model) {
    return null;
  }

  // Fetch images separately with limit and ordering
  const { data: images, error: imagesError } = await supabase
    .from('generated_images')
    .select('*')
    .eq('model_id', model.id)
    .order('created_at', { ascending: false })
    .limit(100); // Limit to most recent 100

  return {
    ...model,
    generated_images: imagesError ? [] : (images || [])
  };
};

/**
 * Delete an image
 */
export const deleteImage = async (imageId) => {
  const { error } = await supabase
    .from('generated_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
  return true;
};

/**
 * Get user profile with credits and subscription info
 */
export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('credits, subscription_plan, subscription_start_date, subscription_renewal_date, monthly_credits_allocated, email')
    .eq('id', user.id)
    .single();

  if (error) {
    // If profile doesn't exist or column doesn't exist, return default
    if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST100' || error.status === 406) {
      console.warn('Profile fetch error, returning defaults:', error);
      return {
        credits: 0,
        subscription_plan: null, // No plan by default
        subscription_start_date: null,
        subscription_renewal_date: null,
        monthly_credits_allocated: 0
      };
    }
    throw error;
  }

  return {
    credits: data?.credits ?? 0,
    subscription_plan: data?.subscription_plan ?? null, // Return null if no plan
    subscription_start_date: data?.subscription_start_date ?? null,
    subscription_renewal_date: data?.subscription_renewal_date ?? null,
    monthly_credits_allocated: data?.monthly_credits_allocated ?? 0,
    email: data?.email ?? null
  };
};

/**
 * Get user credits (backward compatibility)
 */
export const getUserCredits = async () => {
  const profile = await getUserProfile();
  return profile.credits;
};

/**
 * Update user credits
 */
export const updateUserCredits = async (credits) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ credits })
    .eq('id', user.id);

  if (error) throw error;
  return true;
};

/**
 * Deduct credits for image generation and log transaction
 */
export const deductCredits = async (amount, transactionType = 'generation', description = null, metadata = {}) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const currentCredits = await getUserCredits();
  
  if (currentCredits < amount) {
    throw new Error('Insufficient credits');
  }

  const newCredits = currentCredits - amount;

  // Update credits
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', user.id);

  if (updateError) throw updateError;

  // Log transaction
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: user.id,
      amount: -amount, // Negative for deduction
      transaction_type: transactionType,
      description: description || `Credits deducted for ${transactionType}`,
      metadata: metadata
    });

  if (transactionError) {
    console.error('Error logging credit transaction:', transactionError);
    // Don't throw - credits were already deducted
  }

  return newCredits;
};

/**
 * Add credits (for recharges or refunds)
 */
export const addCredits = async (amount, transactionType = 'recharge', description = null, metadata = {}) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const currentCredits = await getUserCredits();
  const newCredits = currentCredits + amount;

  // Update credits
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', user.id);

  if (updateError) throw updateError;

  // Log transaction
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: user.id,
      amount: amount, // Positive for addition
      transaction_type: transactionType,
      description: description || `Credits added via ${transactionType}`,
      metadata: metadata
    });

  if (transactionError) {
    console.error('Error logging credit transaction:', transactionError);
    // Don't throw - credits were already added
  }

  return newCredits;
};

/**
 * Update subscription plan
 */
export const updateSubscriptionPlan = async (planType, action = 'upgraded') => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const now = new Date().toISOString();
  const renewalDate = new Date();
  renewalDate.setMonth(renewalDate.getMonth() + 1); // 1 month from now

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_plan: planType,
      subscription_start_date: now,
      subscription_renewal_date: renewalDate.toISOString()
    })
    .eq('id', user.id);

  if (updateError) throw updateError;

  // Log subscription history
  const { error: historyError } = await supabase
    .from('subscription_history')
    .insert({
      user_id: user.id,
      plan_type: planType,
      action: action,
      amount_paid: null, // Will be set by payment processor
      credits_allocated: null // Will be set by trigger
    });

  if (historyError) {
    console.error('Error logging subscription history:', historyError);
    // Don't throw - subscription was already updated
  }

  return true;
};

/**
 * Get credit transaction history
 */
export const getCreditTransactions = async (limit = 50) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * Get subscription history
 */
export const getSubscriptionHistory = async (limit = 20) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('subscription_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
