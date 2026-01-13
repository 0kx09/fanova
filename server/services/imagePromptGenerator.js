const axios = require('axios');

/**
 * Analyze an uploaded image and generate a detailed prompt for image generation
 * Uses OpenAI Vision API to understand the image and create a prompt
 */
async function generatePromptFromImage(imageBase64, modelData) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const { attributes, facialFeatures, age, nationality } = modelData;
    
    // Build model context
    let modelContext = `Existing Model Information:\n`;
    if (age) modelContext += `- Age: ${age}\n`;
    if (attributes?.gender) modelContext += `- Gender: ${attributes.gender}\n`;
    if (nationality) modelContext += `- Nationality/Ethnicity: ${nationality}\n`;
    if (attributes?.hairColor) modelContext += `- Hair: ${attributes.hairLength || ''} ${attributes.hairStyle || ''} ${attributes.hairColor}\n`;
    if (attributes?.eyeColor) modelContext += `- Eyes: ${attributes.eyeColor}\n`;
    if (attributes?.skinTone) modelContext += `- Skin: ${attributes.skinTone}\n`;
    if (facialFeatures?.faceShape) modelContext += `- Face Shape: ${facialFeatures.faceShape}\n`;

    const systemPrompt = `You are an expert prompt engineer for AI image generation. Your task is to analyze an uploaded image and create a detailed, optimized prompt that will generate a similar image using an existing AI model.

Key requirements:
1. Analyze the uploaded image carefully - note the setting, pose, clothing, expression, lighting, composition
2. Create a prompt that will generate a similar image but using the existing model's characteristics
3. The prompt should maintain the same setting, pose, clothing style, and overall composition as the uploaded image
4. But use the model's facial features, hair, and physical characteristics from the model information
5. Format: Mirror selfie photo, reflection in mirror, person standing in front of mirror
6. Orientation: Vertical 9:16 portrait orientation
7. Quality: Ultra realistic, photorealistic, looks like real person
8. Style: Instagram-ready, social media aesthetic

Your response should be ONLY the optimized prompt text (no explanations, no code blocks, no markdown). The prompt should be detailed, specific, and optimized for image generation AI models like Stable Diffusion or Flux.`;

    const userMessage = `${modelContext}

Analyze this uploaded image and create a detailed prompt for generating a similar image.

The prompt should:
1. Describe the setting/environment shown in the image (e.g., bedroom, coffee shop, beach, gym, etc.)
2. Describe the pose and composition (e.g., standing, sitting, full body, half body, etc.)
3. Describe the clothing/outfit shown in the image
4. Describe the expression and mood
5. Describe the lighting and atmosphere
6. BUT use the model's physical characteristics (age, gender, nationality, hair, eyes, facial features) from the model information above
7. The result should look like the SAME PERSON from the model, but in the same setting/pose/clothing as the uploaded image

CRITICAL: 
- Maintain the exact same setting, pose, clothing, and composition as the uploaded image
- But apply the model's facial features, hair characteristics, and physical appearance
- If nationality is specified, ensure the person looks like that nationality/ethnicity
- The generated image should look like the model person in the uploaded image's scenario

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
            content: [
              {
                type: "text",
                text: userMessage
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                  detail: "high"
                }
              }
            ]
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
      let prompt = response.data.choices[0].message.content.trim();
      
      // Clean up the prompt (remove markdown code blocks if present)
      if (prompt.startsWith('```')) {
        prompt = prompt.replace(/```[^\n]*\n?/g, '').replace(/```$/g, '').trim();
      }
      
      console.log('✅ Generated prompt from uploaded image:', prompt.substring(0, 200) + '...');
      return prompt;
    }

    throw new Error('No response from OpenAI');
  } catch (error) {
    console.error('Error generating prompt from image:', error.response?.data || error.message);
    throw new Error('Failed to generate prompt from image: ' + (error.message || 'Unknown error'));
  }
}

module.exports = {
  generatePromptFromImage
};
