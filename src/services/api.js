const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generate a simple user ID (in production, use proper auth)
const getUserId = () => {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('userId', userId);
  }
  return userId;
};

/**
 * Create a new model profile
 */
export const createModel = async (modelInfo) => {
  const response = await fetch(`${API_BASE_URL}/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...modelInfo,
      userId: getUserId()
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create model');
  }

  return response.json();
};

/**
 * Update model attributes
 */
export const updateModelAttributes = async (modelId, attributes) => {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}/attributes`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ attributes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update attributes');
  }

  return response.json();
};

/**
 * Update model facial features
 */
export const updateModelFacialFeatures = async (modelId, facialFeatures) => {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}/facial-features`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ facialFeatures }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update facial features');
  }

  return response.json();
};

/**
 * Generate images for a model
 */
export const generateModelImages = async (modelId, numImages = 3, referenceImages = null) => {
  const requestBody = { numImages };

  // Add reference images if provided
  if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
    requestBody.referenceImages = referenceImages;
  }

  const response = await fetch(`${API_BASE_URL}/models/${modelId}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate images');
  }

  return response.json();
};

/**
 * Get a specific model
 */
export const getModel = async (modelId) => {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch model');
  }

  return response.json();
};

/**
 * Get all models for the current user
 */
export const getUserModels = async () => {
  const userId = getUserId();
  const response = await fetch(`${API_BASE_URL}/models/user/${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch models');
  }

  return response.json();
};

/**
 * Generate images for a model based on chat prompt
 */
export const generateModelImagesFromChat = async (modelId, userPrompt, numImages = 3, isNsfw = false, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}/generate-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userPrompt, numImages, isNsfw, options }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate images' }));
    const errorObj = new Error(error.error || 'Failed to generate images');
    errorObj.response = { status: response.status, data: error };
    throw errorObj;
  }

  return response.json();
};

/**
 * Delete a model
 */
export const deleteModel = async (modelId) => {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete model');
  }

  return response.json();
};

/**
 * Generate a model name using AI
 */
export const generateModelName = async (context = {}) => {
  const response = await fetch(`${API_BASE_URL}/models/generate-name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate name');
  }

  const data = await response.json();
  return data.name;
};

/**
 * Generate images from an uploaded image
 * Analyzes the image and generates similar images using the model
 */
export const generateImagesFromUploadedImage = async (modelId, imageBase64, numImages = 3, isNsfw = false, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}/generate-from-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      numImages,
      isNsfw,
      options
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate images from uploaded image');
  }

  return response.json();
};

/**
 * Update the locked reference image for a model
 * This is the image selected by the user that will be used for all future generations
 * @param {string} modelId - The model ID
 * @param {string|null} imageUrl - The image URL (optional if imageId is provided)
 * @param {string|null} imageId - The generated_images table ID (optional if imageUrl is provided)
 */
export const updateLockedReferenceImage = async (modelId, imageUrl = null, imageId = null) => {
  const body = {};
  if (imageId) {
    body.imageId = imageId;
  } else if (imageUrl) {
    body.imageUrl = imageUrl;
  } else {
    throw new Error('Either imageUrl or imageId must be provided');
  }

  const response = await fetch(`${API_BASE_URL}/models/${modelId}/locked-reference-image`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { error: errorText || 'Failed to update locked reference image' };
    }
    throw new Error(error.error || 'Failed to update locked reference image');
  }

  return response.json();
};
