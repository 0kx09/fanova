const axios = require('axios');

/**
 * Enhance prompt using OpenAI GPT-4o
 * Takes user request and model data, returns optimized prompt for image generation
 */
async function enhancePromptWithOpenAI(modelData, userPrompt) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, using default prompt generation');
    return null; // Fall back to default prompt generation
  }

  try {
    const { attributes, facialFeatures, age } = modelData;
    
    // Build context about the model
    let modelContext = `Model Information:\n`;
    if (age) modelContext += `- Age: ${age}\n`;
    if (attributes?.gender) modelContext += `- Gender: ${attributes.gender}\n`;
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

Your response should be ONLY the optimized prompt text (no explanations, no code blocks, no markdown). The prompt should be detailed, specific, and optimized for image generation AI models like Stable Diffusion or Flux.

IMPORTANT: Pay careful attention to:
- Setting/environment descriptions (restaurant, cafe, park, beach, etc.)
- Clothing descriptions (elegant dress, fancy outfit, etc.)
- Ensure the setting is clearly described in the prompt
- Ensure clothing is clearly described in the prompt`;

    const userMessage = `${modelContext}

User Request: "${userPrompt}"

Create an optimized, detailed prompt for generating a mirror selfie photo that:
1. Fulfills the user's request EXACTLY: "${userPrompt}" - THIS IS THE PRIORITY
2. Incorporates the model's physical characteristics (age, hair, eyes, facial features) from above
3. If user mentions a setting (beach, restaurant, gym, etc.), use clothing appropriate for that setting
4. If user mentions clothing directly, use that clothing exactly
5. DO NOT use the model's stored "style" attribute if it conflicts with the user's request
6. Includes proper composition (full body if requested, otherwise head/shoulders)
7. Is optimized for AI image generation
8. Maintains mirror selfie aesthetic (reflection in mirror, no phone visible unless requested)

CRITICAL: User's explicit requests (setting, clothing, outfit) override any stored model attributes. If user says "beach" or "suitable outfit for beach", use beach-appropriate clothing (bikini, swimsuit, beachwear), NOT the model's stored style.

Return ONLY the prompt text, nothing else.`;

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
            content: userMessage
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
