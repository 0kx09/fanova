const axios = require('axios');

/**
 * Generate a model name using OpenAI
 * Returns a creative, appropriate name for an AI model
 */
async function generateModelName(context = {}) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, using fallback name generation');
    return generateFallbackName();
  }

  try {
    const { nationality, occupation, gender } = context;
    
    // Build context string
    let contextString = 'Generate a creative and memorable name for an AI model.';
    if (nationality) contextString += ` The model is ${nationality}.`;
    if (occupation) contextString += ` Occupation: ${occupation}.`;
    if (gender) contextString += ` Gender: ${gender}.`;

    const systemPrompt = `You are a creative naming expert. Generate a single, memorable name for an AI model character. 
The name should be:
- Easy to remember and pronounce
- Appropriate for a professional AI model
- 1-2 words maximum (first name, or first name + last name)
- Not offensive or inappropriate
- Suitable for a fashion/modeling context

Return ONLY the name, nothing else. No explanations, no quotes, no additional text. Just the name.`;

    const userMessage = contextString || 'Generate a creative name for an AI model.';

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini", // Using mini for cost efficiency
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
        max_tokens: 50,
        temperature: 0.8 // Higher temperature for more creativity
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    if (response.data.choices && response.data.choices[0]) {
      let generatedName = response.data.choices[0].message.content.trim();
      
      // Clean up the name (remove quotes, markdown, etc.)
      generatedName = generatedName.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
      generatedName = generatedName.replace(/```[^\n]*\n?/g, '').replace(/```$/g, '').trim(); // Remove code blocks
      generatedName = generatedName.split('\n')[0].trim(); // Take first line only
      
      // Validate it's a reasonable name (not too long, not empty)
      if (generatedName && generatedName.length <= 50 && generatedName.length > 0) {
        console.log('OpenAI generated name:', generatedName);
        return generatedName;
      }
    }

    throw new Error('Invalid response from OpenAI');
  } catch (error) {
    console.error('OpenAI name generation error:', error.response?.data || error.message);
    // Fall back to default name generation
    return generateFallbackName(context);
  }
}

/**
 * Generate a fallback name if OpenAI is not available
 */
function generateFallbackName(context = {}) {
  const { nationality } = context;
  
  // Simple fallback names based on nationality or random
  const names = [
    'Sophia', 'Emma', 'Olivia', 'Isabella', 'Ava', 'Mia', 'Charlotte', 'Amelia',
    'Harper', 'Evelyn', 'Luna', 'Aria', 'Chloe', 'Layla', 'Zoe', 'Victoria',
    'Nora', 'Riley', 'Lily', 'Aubrey'
  ];
  
  // If nationality is provided, try to use culturally appropriate names
  if (nationality) {
    const nationalityLower = nationality.toLowerCase();
    if (nationalityLower.includes('japan') || nationalityLower.includes('japanese')) {
      return 'Sakura';
    } else if (nationalityLower.includes('korea') || nationalityLower.includes('korean')) {
      return 'Min-ji';
    } else if (nationalityLower.includes('china') || nationalityLower.includes('chinese')) {
      return 'Li Wei';
    } else if (nationalityLower.includes('india') || nationalityLower.includes('indian')) {
      return 'Priya';
    } else if (nationalityLower.includes('spanish') || nationalityLower.includes('spain') || 
               nationalityLower.includes('mexic') || nationalityLower.includes('latin')) {
      return 'Isabella';
    } else if (nationalityLower.includes('french') || nationalityLower.includes('france')) {
      return 'Sophie';
    } else if (nationalityLower.includes('german') || nationalityLower.includes('germany')) {
      return 'Emma';
    } else if (nationalityLower.includes('russian') || nationalityLower.includes('russia')) {
      return 'Anastasia';
    }
  }
  
  // Return a random name from the list
  return names[Math.floor(Math.random() * names.length)];
}

module.exports = {
  generateModelName
};
