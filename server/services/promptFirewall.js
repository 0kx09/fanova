/**
 * Prompt Firewall Service
 *
 * This service filters user prompts to prevent identity changes.
 * It allows only STYLE changes (pose, expression, outfit, scene, lighting)
 * and blocks IDENTITY changes (face, age, ethnicity, etc.)
 *
 * This is a critical security layer for identity-locked generation.
 */

/**
 * Keywords that indicate identity changes (BLOCKED)
 */
const IDENTITY_KEYWORDS = [
  // Face structure
  'face', 'facial', 'jawline', 'jaw', 'chin', 'cheekbones', 'forehead',

  // Eyes
  'eye color', 'eye shape', 'eyes', 'eyebrows', 'eyelashes',

  // Nose
  'nose', 'nostrils',

  // Mouth/lips
  'lips', 'mouth', 'teeth', 'smile shape',

  // Skin
  'skin color', 'skin tone', 'complexion', 'tan', 'pale', 'dark skin', 'light skin',

  // Hair (color/texture changes, not style)
  'hair color', 'blonde', 'brunette', 'redhead', 'black hair', 'white hair', 'gray hair',
  'hair texture', 'curly hair', 'straight hair', 'wavy hair',

  // Age
  'age', 'older', 'younger', 'aged', 'wrinkles', 'baby face', 'mature',

  // Identity
  'ethnicity', 'race', 'nationality', 'look like', 'become', 'transform into',
  'change to', 'turn into',

  // Body type (structural changes)
  'body type', 'muscular', 'thin', 'fat', 'skinny', 'heavy', 'build',

  // Gender
  'gender', 'male', 'female', 'man', 'woman', 'boy', 'girl'
];

/**
 * Keywords that are ALLOWED (style only)
 */
const ALLOWED_KEYWORDS = [
  // Pose & expression
  'pose', 'standing', 'sitting', 'lying', 'leaning', 'kneeling',
  'smiling', 'laughing', 'serious', 'expression', 'looking', 'gazing',

  // Clothing & accessories
  'wearing', 'outfit', 'clothes', 'dress', 'shirt', 'pants', 'skirt',
  'jewelry', 'necklace', 'earrings', 'hat', 'glasses', 'sunglasses',

  // Hair style (NOT color/texture)
  'hairstyle', 'ponytail', 'bun', 'braids', 'updo', 'down',

  // Scene & location
  'in', 'at', 'near', 'background', 'setting', 'location', 'place',
  'beach', 'park', 'room', 'street', 'city', 'forest', 'mountain',

  // Lighting & atmosphere
  'lighting', 'light', 'bright', 'dark', 'shadows', 'sunset', 'sunrise',
  'golden hour', 'blue hour', 'night', 'day', 'indoor', 'outdoor',

  // Camera & composition
  'close-up', 'portrait', 'full body', 'wide shot', 'angle', 'perspective',

  // Style & mood
  'cinematic', 'artistic', 'professional', 'casual', 'elegant', 'dramatic',
  'vintage', 'modern', 'minimalist'
];

/**
 * Filter user prompt to remove identity-changing instructions
 * Allows only style changes (pose, expression, outfit, scene, lighting)
 *
 * @param {string} userPrompt - Raw user input
 * @returns {object} { filteredPrompt, blocked, warnings }
 */
function filterPrompt(userPrompt) {
  const lowercasePrompt = userPrompt.toLowerCase();
  const warnings = [];
  const blockedKeywords = [];

  // Check for identity-changing keywords (whole word only, not substring)
  for (const keyword of IDENTITY_KEYWORDS) {
    // Use word boundary regex to match whole words only, not substrings
    const keywordLower = keyword.toLowerCase();
    // Create regex pattern that matches whole word (handles multi-word keywords too)
    const keywordPattern = keywordLower.includes(' ') 
      ? new RegExp(`\\b${keywordLower.replace(/\s+/g, '\\s+')}\\b`, 'i')
      : new RegExp(`\\b${keywordLower}\\b`, 'i');
    
    if (keywordPattern.test(lowercasePrompt)) {
      blockedKeywords.push(keyword);
      warnings.push(`⚠️ Blocked identity change: "${keyword}"`);
    }
  }

  // If identity changes detected, filter them out
  let filteredPrompt = userPrompt;

  if (blockedKeywords.length > 0) {
    // Remove sentences containing blocked keywords (whole word only)
    const sentences = userPrompt.split(/[.!?,]+/);
    const filteredSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return !IDENTITY_KEYWORDS.some(keyword => {
        const keywordLower = keyword.toLowerCase();
        const keywordPattern = keywordLower.includes(' ')
          ? new RegExp(`\\b${keywordLower.replace(/\s+/g, '\\s+')}\\b`, 'i')
          : new RegExp(`\\b${keywordLower}\\b`, 'i');
        return keywordPattern.test(lowerSentence);
      });
    });

    filteredPrompt = filteredSentences.join(', ').trim();

    // If everything was filtered out, return a safe default
    if (!filteredPrompt) {
      filteredPrompt = 'Professional portrait, natural lighting, neutral expression';
      warnings.push('⚠️ All content was filtered. Using default style prompt.');
    }
  }

  return {
    filteredPrompt,
    blocked: blockedKeywords.length > 0,
    warnings,
    original: userPrompt
  };
}

/**
 * Validate if a prompt is safe (style-only)
 * Returns true if prompt only contains style changes
 *
 * @param {string} userPrompt - Raw user input
 * @returns {boolean} True if safe, false if contains identity changes
 */
function isPromptSafe(userPrompt) {
  const { blocked } = filterPrompt(userPrompt);
  return !blocked;
}

/**
 * Extract style keywords from prompt
 * Returns only the style-related parts of the prompt
 *
 * @param {string} userPrompt - Raw user input
 * @returns {string[]} Array of style keywords
 */
function extractStyleKeywords(userPrompt) {
  const lowercasePrompt = userPrompt.toLowerCase();
  const styleKeywords = [];

  for (const keyword of ALLOWED_KEYWORDS) {
    if (lowercasePrompt.includes(keyword.toLowerCase())) {
      styleKeywords.push(keyword);
    }
  }

  return styleKeywords;
}

/**
 * Enhance user prompt with style focus
 * Adds style-focusing instructions while maintaining safety
 *
 * @param {string} userPrompt - Filtered user input
 * @returns {string} Enhanced prompt
 */
function enhanceStylePrompt(userPrompt) {
  const filtered = filterPrompt(userPrompt);
  const styleKeywords = extractStyleKeywords(filtered.filteredPrompt);

  // If prompt is already style-focused, return it
  if (styleKeywords.length > 0) {
    return filtered.filteredPrompt;
  }

  // Otherwise, add style focus
  return `${filtered.filteredPrompt}. Professional photography, natural lighting, high quality.`;
}

/**
 * Generate a safe prompt from potentially unsafe input
 * This is the main entry point for the firewall
 *
 * @param {string} userPrompt - Raw user input
 * @param {object} options - Options (strict mode, etc.)
 * @returns {object} { safePrompt, warnings, blocked }
 */
function generateSafePrompt(userPrompt, options = {}) {
  const { strict = true } = options;

  // Filter the prompt
  const filterResult = filterPrompt(userPrompt);

  // In strict mode, enhance with style focus
  const safePrompt = strict
    ? enhanceStylePrompt(filterResult.filteredPrompt)
    : filterResult.filteredPrompt;

  return {
    safePrompt,
    warnings: filterResult.warnings,
    blocked: filterResult.blocked,
    original: filterResult.original
  };
}

/**
 * Log firewall actions for monitoring
 *
 * @param {string} modelId - Model UUID
 * @param {string} originalPrompt - Original user prompt
 * @param {string} filteredPrompt - Filtered prompt
 * @param {string[]} warnings - Warnings generated
 */
function logFirewallAction(modelId, originalPrompt, filteredPrompt, warnings) {
  if (warnings.length > 0) {
    console.log(`🛡️ PROMPT FIREWALL [Model ${modelId}]`);
    console.log(`   Original: "${originalPrompt}"`);
    console.log(`   Filtered: "${filteredPrompt}"`);
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
}

module.exports = {
  filterPrompt,
  isPromptSafe,
  extractStyleKeywords,
  enhanceStylePrompt,
  generateSafePrompt,
  logFirewallAction
};
