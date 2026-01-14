/**
 * Identity Packet Service
 *
 * This service manages identity-locked generation with reference reinjection.
 * It ensures that every generation uses the ORIGINAL reference images and identity prompt,
 * preventing identity drift over multiple generations.
 *
 * Core Principles:
 * 1. Identity is locked at creation time
 * 2. Reference images are NEVER replaced with generated images
 * 3. Every generation rebuilds from the ground truth
 * 4. Chat history is UX only - backend rebuilds identity every request
 */

const supabase = require('../config/supabase');

/**
 * Create an identity packet for a new model
 *
 * @param {string} modelId - The model's UUID
 * @param {object} modelData - Model information (age, nationality, etc.)
 * @param {string[]} referenceImageUrls - 2-4 ground truth reference images (URLs)
 * @returns {object} Identity packet
 */
async function createIdentityPacket(modelId, modelData, referenceImageUrls = []) {
  // Generate detailed identity prompt from model data
  const identityPrompt = generateIdentityPrompt(modelData);

  // Validate reference images (should be 2-4)
  if (referenceImageUrls.length > 0 && (referenceImageUrls.length < 2 || referenceImageUrls.length > 4)) {
    console.warn(`⚠️ Reference images should be 2-4, got ${referenceImageUrls.length}`);
  }

  const identityPacket = {
    persona_id: modelId,
    identity_prompt: identityPrompt,
    reference_images: referenceImageUrls.slice(0, 4), // Max 4 images
    created_at: new Date().toISOString(),
    locked: true // Identity is locked and cannot be changed
  };

  // Store in Supabase
  await supabase
    .from('models')
    .update({
      identity_packet: identityPacket
    })
    .eq('id', modelId);

  console.log(`✅ Identity packet created for model ${modelId}`);
  console.log(`📸 Reference images: ${identityPacket.reference_images.length}`);

  return identityPacket;
}

/**
 * Generate a detailed identity prompt from model data
 * This prompt describes facial features, proportions, and identity markers
 * that must remain IDENTICAL across all generations.
 *
 * @param {object} modelData - Model information
 * @returns {string} Identity prompt
 */
function generateIdentityPrompt(modelData) {
  const parts = [];

  // Age and basic appearance
  if (modelData.age) {
    parts.push(`A ${modelData.age}-year-old ${modelData.gender || 'person'}`);
  }

  // Facial features (detailed description)
  const facialFeatures = modelData.facialFeatures || modelData.facial_features || {};

  // Eyes
  const eyeShape = facialFeatures.eyeShape || 'almond-shaped';
  const eyeColor = facialFeatures.eyeColor || 'brown';
  parts.push(`with ${eyeShape} ${eyeColor} eyes`);

  // Skin
  const skinTone = facialFeatures.skinTone || modelData.attributes?.ethnicity || 'olive';
  parts.push(`${skinTone} skin tone`);

  // Face shape
  const faceShape = facialFeatures.faceShape || 'soft';
  const jawline = facialFeatures.jawline || 'defined';
  parts.push(`${faceShape} ${jawline} jawline`);

  // Nose
  const noseShape = facialFeatures.noseShape || 'narrow';
  parts.push(`${noseShape} nose bridge`);

  // Lips
  const lipFullness = facialFeatures.lipFullness || 'full';
  parts.push(`${lipFullness} lips`);

  // Hair
  const hairColor = facialFeatures.hairColor || 'dark';
  const hairLength = facialFeatures.hairLength || 'long';
  const hairTexture = facialFeatures.hairTexture || 'wavy';
  parts.push(`${hairLength} ${hairColor} ${hairTexture} hair`);

  // Nationality/ethnicity context
  if (modelData.nationality) {
    parts.push(`of ${modelData.nationality} descent`);
  }

  // Critical instruction
  const identityPrompt = parts.join(', ') +
    '. Facial proportions, eye spacing, nose shape, jawline structure, skin tone, age, and overall identity must remain IDENTICAL in every image. ' +
    'This is a specific individual person with unique facial features that cannot change.';

  return identityPrompt;
}

/**
 * Get the identity packet for a model
 * This is called on EVERY generation to ensure consistency
 *
 * @param {string} modelId - The model's UUID
 * @returns {object|null} Identity packet or null if not found
 */
async function getIdentityPacket(modelId) {
  const { data: model, error } = await supabase
    .from('models')
    .select('identity_packet, age, nationality, attributes, facial_features')
    .eq('id', modelId)
    .single();

  if (error || !model) {
    console.error(`❌ Could not fetch model ${modelId}:`, error);
    return null;
  }

  // If identity_packet exists, return it
  if (model.identity_packet) {
    return model.identity_packet;
  }

  // Legacy support: If no identity packet, create one from model data
  console.log(`⚠️ Model ${modelId} has no identity packet, creating one...`);

  const modelData = {
    age: model.age,
    nationality: model.nationality,
    attributes: model.attributes || {},
    facialFeatures: model.facial_features || {}
  };

  // Get reference images from generated_images table (first few images)
  const { data: generatedImages } = await supabase
    .from('generated_images')
    .select('image_url')
    .eq('model_id', modelId)
    .order('created_at', { ascending: true })
    .limit(3);

  const referenceImageUrls = (generatedImages || []).map(img => img.image_url);

  return await createIdentityPacket(modelId, modelData, referenceImageUrls);
}

/**
 * Get reference images for consistent generation
 * ALWAYS returns the ORIGINAL reference images, never generated ones
 *
 * @param {string} modelId - The model's UUID
 * @returns {string[]} Reference image URLs
 */
async function getReferenceImages(modelId) {
  const identityPacket = await getIdentityPacket(modelId);

  if (!identityPacket) {
    return [];
  }

  return identityPacket.reference_images || [];
}

/**
 * Build the complete generation prompt with identity locking
 * This is the core of the identity-locked generation system
 *
 * @param {string} modelId - The model's UUID
 * @param {string} userPrompt - User's style/pose prompt (filtered)
 * @returns {object} { systemPrompt, identityPrompt, userPrompt, instruction }
 */
async function buildLockedGenerationPrompt(modelId, userPrompt) {
  const identityPacket = await getIdentityPacket(modelId);

  if (!identityPacket) {
    throw new Error('Identity packet not found for model');
  }

  const systemPrompt =
    'You are generating images of the same person. Identity must not change across generations. ' +
    'Facial structure, features, and overall appearance must remain IDENTICAL.';

  const identityPrompt = identityPacket.identity_prompt;

  const instruction =
    'STRICT INSTRUCTION: Preserve facial structure, eye spacing, nose shape, jawline, skin tone, age, and overall identity exactly. ' +
    'Do not alter identity. If the user prompt conflicts with identity, IGNORE the conflicting instruction and preserve identity.';

  // Combine into final prompt
  const fullPrompt = `${systemPrompt}\n\nIDENTITY (LOCKED):\n${identityPrompt}\n\nUSER STYLE REQUEST:\n${userPrompt}\n\n${instruction}`;

  return {
    systemPrompt,
    identityPrompt,
    userPrompt,
    instruction,
    fullPrompt,
    referenceImages: identityPacket.reference_images
  };
}

/**
 * Update reference images for a model (USE WITH CAUTION)
 * Only call this when the user explicitly uploads NEW ground truth images
 * NEVER call this with generated images
 *
 * @param {string} modelId - The model's UUID
 * @param {string[]} newReferenceImageUrls - New ground truth reference images
 * @returns {boolean} Success
 */
async function updateReferenceImages(modelId, newReferenceImageUrls) {
  if (newReferenceImageUrls.length < 2 || newReferenceImageUrls.length > 4) {
    throw new Error('Reference images must be 2-4 images');
  }

  const identityPacket = await getIdentityPacket(modelId);

  if (!identityPacket) {
    throw new Error('Identity packet not found');
  }

  // Update reference images
  identityPacket.reference_images = newReferenceImageUrls;
  identityPacket.updated_at = new Date().toISOString();

  await supabase
    .from('models')
    .update({
      identity_packet: identityPacket
    })
    .eq('id', modelId);

  console.log(`✅ Reference images updated for model ${modelId}`);
  return true;
}

module.exports = {
  createIdentityPacket,
  getIdentityPacket,
  getReferenceImages,
  buildLockedGenerationPrompt,
  updateReferenceImages,
  generateIdentityPrompt
};
