const axios = require('axios');

/**
 * Enhance prompt using OpenAI GPT-4o
 * Takes user request and model data, returns optimized prompt for image generation
 * Optionally uses referenceImageBase64 for visual consistency
 */
async function enhancePromptWithOpenAI(modelData, userPrompt, referenceImageBase64 = null) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, using default prompt generation');
    return null; // Fall back to default prompt generation
  }

  try {
    const { attributes, facialFeatures, age, nationality } = modelData;
    
    // Build context about the model
    let modelContext = `Model Information:\n`;
    if (age) modelContext += `- Age: ${age}\n`;
    if (attributes?.gender) modelContext += `- Gender: ${attributes.gender}\n`;
    if (nationality) modelContext += `- Nationality/Ethnicity: ${nationality}\n`;
    if (attributes?.hairColor) modelContext += `- Hair: ${attributes.hairLength || ''} ${attributes.hairStyle || ''} ${attributes.hairColor}\n`;
    if (attributes?.eyeColor) modelContext += `- Eyes: ${attributes.eyeColor}\n`;
    if (attributes?.skinTone) modelContext += `- Skin: ${attributes.skinTone}\n`;
    if (facialFeatures?.faceShape) modelContext += `- Face Shape: ${facialFeatures.faceShape}\n`;
    if (facialFeatures?.expression) modelContext += `- Expression: ${facialFeatures.expression}\n`;

    const systemPrompt = `You are an expert prompt engineer for AI image generation. Your task is to create highly detailed, optimized prompts that will generate accurate and beautiful mirror selfie photos.

Key requirements for mirror selfie prompts:
1. Format: Mirror selfie photo, reflection in mirror, person standing in front of mirror
2. Composition: Detect if user wants full body, half body, or head/shoulders (default)
3. Orientation: Vertical 9:16 portrait orientation
4. Quality: Ultra realistic, photorealistic, looks like real person
5. Style: Instagram-ready, social media aesthetic
6. NO phone visible unless explicitly requested
7. NO camera UI or screen elements
8. Direct view of mirror reflection
9. CRITICAL: Must look like it was taken on an iPhone - include iPhone camera characteristics
10. CRITICAL: Add realistic imperfections - subtle noise, grain, natural photo artifacts
11. CRITICAL: Should look like an actual photo, not a perfect render - include natural imperfections
12. CRITICAL: Setting/environment description is HIGHEST PRIORITY - if user says "messy bedroom", the bedroom MUST be messy with unmade bed, clothes scattered, disorganized. If user says "clean", make it clean. NEVER override user's setting description with generic "clean" or "organized" defaults.

Your response should be ONLY the optimized prompt text (no explanations, no code blocks, no markdown). The prompt should be detailed, specific, and optimized for image generation AI models like Stable Diffusion or Flux.

IMPORTANT: Pay careful attention to:
- Nationality/Ethnicity: If nationality is specified (e.g., Latina, Asian, African, European, etc.), the person MUST look like that ethnicity. Use appropriate facial features, skin tone, and characteristics that match that nationality/ethnicity.
- Setting/environment descriptions (restaurant, cafe, park, beach, etc.)
- Clothing descriptions (elegant dress, fancy outfit, etc.)
- Ensure the setting is clearly described in the prompt
- Ensure clothing is clearly described in the prompt
- CRITICAL: If user mentions "messy", "cluttered", "untidy", "disorganized", "unmade bed", "clothes scattered", etc., the setting MUST be messy and cluttered. Do NOT make it clean or organized. Include details like: unmade bed, clothes on furniture/floor, disorganized items, lived-in appearance.
- CRITICAL: User's setting description (messy, clean, cluttered, etc.) is the HIGHEST PRIORITY - do not override it with generic "clean" or "organized" descriptions.
- CRITICAL: Always include "taken on iPhone", "iPhone camera quality", "iPhone photo" in the prompt
- CRITICAL: Always include realistic imperfections: "subtle film grain", "natural photo noise", "realistic photo imperfections", "authentic photo grain"
- CRITICAL: The image must look like an actual iPhone photo, not a perfect render - include natural noise, grain, and imperfections`;

    let userMessage = `${modelContext}

User Request: "${userPrompt}"

Create an optimized, detailed prompt for generating a mirror selfie photo that:
1. Fulfills the user's request EXACTLY: "${userPrompt}" - THIS IS THE PRIORITY
2. CRITICAL - Nationality/Ethnicity: If nationality is specified in the model information, the person MUST have the facial features, skin tone, and characteristics that match that nationality/ethnicity. For example:
   - If nationality is "Latina" or "Latin American": Use Latina/Latino facial features, typically darker skin tone, specific facial structure
   - If nationality is "Asian": Use Asian facial features, typically lighter to medium skin tone, specific eye shape
   - If nationality is "African" or "African American": Use African/African American facial features, typically darker skin tone, specific facial structure
   - If nationality is "European" or "Caucasian": Use European/Caucasian facial features, typically lighter skin tone
   - Apply similar logic for other nationalities/ethnicities
   - This is CRITICAL for accuracy - the generated person must look like the specified nationality/ethnicity
3. Incorporates the model's physical characteristics (age, hair, eyes, facial features) from above`;

    // If reference image is provided, add visual consistency instruction
    if (referenceImageBase64) {
      userMessage += `
4. CRITICAL: Maintain the EXACT same facial features, hair characteristics, skin tone, nationality/ethnicity appearance, and overall appearance as shown in the reference image
5. The new image should look like the SAME PERSON, just in a different setting/pose/clothing as requested`;
    }

    userMessage += `
${referenceImageBase64 ? '6' : '4'}. If user mentions a setting (beach, restaurant, gym, bedroom, etc.), describe that setting EXACTLY as requested. If user says "messy bedroom", the bedroom MUST be messy with unmade bed, clothes scattered, disorganized items. If user says "clean bedroom", make it clean. NEVER override user's setting description.
${referenceImageBase64 ? '7' : '5'}. CRITICAL - Setting details: If user mentions "messy", "cluttered", "untidy", "disorganized", "unmade bed", "clothes on floor/chair", etc., the background MUST show these elements: unmade bed, clothes scattered on furniture or floor, disorganized room, lived-in messy appearance. Do NOT make it clean or organized.
${referenceImageBase64 ? '8' : '6'}. If user mentions clothing directly, use that clothing exactly
${referenceImageBase64 ? '9' : '7'}. DO NOT use the model's stored "style" attribute if it conflicts with the user's request
${referenceImageBase64 ? '10' : '8'}. Includes proper composition (full body if requested, otherwise head/shoulders)
${referenceImageBase64 ? '11' : '9'}. Is optimized for AI image generation
${referenceImageBase64 ? '12' : '10'}. Maintains mirror selfie aesthetic (reflection in mirror, no phone visible unless requested)
${referenceImageBase64 ? '13' : '11'}. CRITICAL: Must include "taken on iPhone", "iPhone camera quality", and realistic imperfections like "subtle film grain", "natural photo noise", "realistic photo imperfections" to make it look like an actual iPhone photo
${referenceImageBase64 ? '14' : '12'}. Should look like a real photo taken on an iPhone, not a perfect render - include natural noise, grain, and imperfections that make it authentic

CRITICAL: User's explicit requests (setting, clothing, outfit) override any stored model attributes. If user says "beach" or "suitable outfit for beach", use beach-appropriate clothing (bikini, swimsuit, beachwear), NOT the model's stored style. If user says "messy bedroom", the bedroom MUST be messy - do NOT make it clean or organized.

Return ONLY the prompt text, nothing else.`;

    // Build message content - include image if provided
    const messageContent = [];
    messageContent.push({ type: "text", text: userMessage });
    
    if (referenceImageBase64) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: referenceImageBase64,
          detail: "high"
        }
      });
      console.log('👁️ Using vision API with reference image for prompt enhancement');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: messageContent
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    if (response.data.choices && response.data.choices[0]) {
      const enhancedPrompt = response.data.choices[0].message.content.trim();
      
      // Clean up the prompt (remove markdown code blocks if present)
      let cleanedPrompt = enhancedPrompt;
      if (cleanedPrompt.startsWith('```')) {
        cleanedPrompt = cleanedPrompt.replace(/```[^\n]*\n?/g, '').replace(/```$/g, '').trim();
      }
      
      console.log('OpenAI enhanced prompt:', cleanedPrompt);
      return cleanedPrompt;
    }

    throw new Error('No response from OpenAI');
  } catch (error) {
    console.error('OpenAI prompt enhancement error:', error.response?.data || error.message);
    // Return null to fall back to default prompt generation
    return null;
  }
}

module.exports = {
  enhancePromptWithOpenAI
};
