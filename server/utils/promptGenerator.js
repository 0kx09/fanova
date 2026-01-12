/**
 * Generate a detailed prompt for iPhone selfie-style image generation
 */
function generatePrompt(modelData) {
  const { attributes, facialFeatures, age } = modelData;

  let promptParts = [];

  // Critical mirror selfie characteristics - ALWAYS FIRST (full body for reference images)
  promptParts.push('full body mirror selfie photo');
  promptParts.push('reflection in full length mirror');
  promptParts.push('person standing in front of full length mirror');
  promptParts.push('viewing full body reflection in mirror');
  promptParts.push('vertical 9:16 portrait orientation');
  promptParts.push('full body composition');

  // Subject description with gender
  const gender = attributes?.gender || '';
  let subjectDesc = '';

  if (age && gender) {
    subjectDesc = `${age} year old ${gender}`;
  } else if (age) {
    subjectDesc = `${age} year old person`;
  } else if (gender) {
    subjectDesc = `young adult ${gender}`;
  } else {
    subjectDesc = 'young adult';
  }

  promptParts.push(subjectDesc);

  // Physical attributes - detailed and specific
  if (attributes) {
    // Hair - very specific
    if (attributes.hairColor || attributes.hairStyle || attributes.hairLength) {
      const hairParts = [];
      if (attributes.hairLength) hairParts.push(attributes.hairLength);
      if (attributes.hairStyle) hairParts.push(attributes.hairStyle.toLowerCase());
      if (attributes.hairColor) hairParts.push(attributes.hairColor.toLowerCase());
      if (hairParts.length > 0) {
        promptParts.push(`with ${hairParts.join(' ')} hair`);
      }
    }

    // Eyes
    if (attributes.eyeColor) {
      promptParts.push(`${attributes.eyeColor.toLowerCase()} eyes`);
    }

    // Skin tone
    if (attributes.skinTone) {
      promptParts.push(`${attributes.skinTone.toLowerCase()} skin`);
    }

    // Body type
    if (attributes.bodyType) {
      promptParts.push(`${attributes.bodyType.toLowerCase()} body type`);
    }
  }

  // Facial features - highly detailed
  if (facialFeatures) {
    if (facialFeatures.faceShape) {
      promptParts.push(`${facialFeatures.faceShape.toLowerCase()}-shaped face`);
    }

    if (facialFeatures.eyeShape) {
      promptParts.push(`${facialFeatures.eyeShape.toLowerCase()}-shaped eyes`);
    }

    if (facialFeatures.noseShape) {
      promptParts.push(`${facialFeatures.noseShape.toLowerCase()} nose`);
    }

    if (facialFeatures.lipShape) {
      promptParts.push(`${facialFeatures.lipShape.toLowerCase()} lips`);
    }

    // Expression - critical for selfies
    if (facialFeatures.expression) {
      const expr = facialFeatures.expression.toLowerCase();
      if (expr === 'smiling' || expr === 'laughing') {
        promptParts.push('genuine warm smile');
      } else if (expr === 'neutral') {
        promptParts.push('relaxed natural expression');
      } else {
        promptParts.push(`${expr} expression`);
      }
    } else {
      promptParts.push('natural friendly expression');
    }
  }

  // Clothing style
  if (attributes && attributes.style) {
    promptParts.push(`wearing ${attributes.style.toLowerCase()} outfit`);
  } else {
    promptParts.push('wearing casual modern clothing');
  }

  // iPhone-specific lighting and quality characteristics
  const lightingType = facialFeatures?.lighting?.toLowerCase() || 'natural';

  if (lightingType === 'natural' || lightingType === 'golden hour') {
    promptParts.push('natural window light');
    promptParts.push('soft even lighting on face');
  } else if (lightingType === 'studio' || lightingType === 'ring light') {
    promptParts.push('bright even indoor lighting');
    promptParts.push('ring light catch light in eyes');
  } else if (lightingType === 'dramatic') {
    promptParts.push('dramatic side lighting');
    promptParts.push('high contrast');
  } else {
    promptParts.push('soft natural lighting');
    promptParts.push('well-lit face');
  }

  // Mirror selfie quality characteristics (what you see in the mirror)
  promptParts.push('reflection quality');
  promptParts.push('face in sharp focus');
  promptParts.push('accurate skin tones');
  promptParts.push('realistic lighting');
  promptParts.push('mirror reflection perspective');

  // Composition - ALWAYS full body for reference images
  promptParts.push('full body visible, head to toe');
  promptParts.push('full body shot, entire figure visible');
  promptParts.push('reflection in full length mirror');
  promptParts.push('person standing in front of full length mirror');
  promptParts.push('full body framing, standing full body');
  promptParts.push('centered composition');
  promptParts.push('entire body from head to feet visible');

  // Background - realistic selfie backgrounds based on setting
  const setting = facialFeatures?.setting?.trim().toLowerCase();

  if (setting) {
    // User specified a custom setting
    promptParts.push(`in ${setting}`);
    promptParts.push(`${setting} background visible`);

    // Add context-appropriate details based on setting keywords
    if (setting.includes('bedroom') || setting.includes('room')) {
      promptParts.push('casual home environment');
    } else if (setting.includes('gym') || setting.includes('workout')) {
      promptParts.push('fitness environment');
    } else if (setting.includes('car')) {
      promptParts.push('sitting in vehicle');
    } else if (setting.includes('coffee') || setting.includes('cafe') || setting.includes('restaurant')) {
      promptParts.push('public indoor space');
    } else if (setting.includes('beach') || setting.includes('park') || setting.includes('outdoor')) {
      promptParts.push('natural outdoor environment');
    } else if (setting.includes('office') || setting.includes('work')) {
      promptParts.push('professional setting');
    }
  } else {
    // Default simple background
    promptParts.push('simple indoor background');
    promptParts.push('casual home environment');
  }

  // Technical quality markers for mirror selfie
  promptParts.push('high quality photo');
  promptParts.push('crisp modern photo quality');
  promptParts.push('natural photo processing');
  promptParts.push('Instagram-ready');
  promptParts.push('social media aesthetic');

  // Final quality - emphasize mirror reflection perspective
  promptParts.push('direct view of mirror reflection');
  promptParts.push('no phone or screen visible');
  promptParts.push('ultra realistic');
  promptParts.push('photorealistic');
  promptParts.push('looks like real person');
  promptParts.push('authentic candid moment');

  // Join all parts with commas
  const fullPrompt = promptParts.join(', ');

  return fullPrompt;
}

/**
 * Generate negative prompt to avoid unwanted elements for iPhone selfies
 */
function generateNegativePrompt() {
  return [
    // Quality issues
    'lowres', 'bad anatomy', 'bad hands', 'deformed fingers', 'missing fingers', 'extra fingers',
    'text', 'error', 'cropped', 'worst quality', 'low quality', 'jpeg artifacts',
    'blurry', 'out of focus face', 'distorted', 'disfigured', 'poorly drawn face',
    'bad proportions', 'mutation', 'deformed', 'ugly',

    // Phone and camera UI elements - CRITICAL
    'phone visible', 'smartphone visible', 'iPhone visible', 'phone in hand', 'phone screen',
    'camera UI', 'camera interface', 'camera app', 'camera buttons', 'camera controls',
    'phone frame', 'phone bezel', 'phone border', 'screen UI', 'interface elements',
    'shutter button', 'camera icon', 'timer display', 'flash icon', 'settings icon',
    'phone case visible', 'phone back visible', 'phone reflection', 'phone shadow',

    // Not iPhone-like
    'professional studio photo', 'DSLR camera', 'professional camera', 'studio backdrop',
    'perfect lighting', 'commercial photography', 'fashion photography',
    'landscape orientation', 'horizontal photo', 'wide angle',

    // Unwanted elements
    'multiple people', 'crowd', 'watermark', 'signature', 'username', 'logo',
    'cartoon', 'anime', 'drawing', 'painting', 'CGI', '3D render',
    'black and white', 'grayscale', 'sepia',

    // Unrealistic features
    'perfect skin', 'airbrushed', 'overly smooth', 'plastic skin',
    'unnatural colors', 'oversaturated', 'HDR artifact', 'halo effect',

    // Wrong perspective (unless explicitly requested)
    'through phone screen', 'looking at phone', 'phone camera view', 'camera preview',

    // Technical issues
    'noise', 'grain', 'compression artifacts', 'pixelated',
    'overexposed', 'underexposed', 'harsh shadows', 'red eye'
  ].join(', ');
}

/**
 * Generate a chat-based prompt that incorporates user's scene description
 * with the existing model's characteristics
 */
function generateChatPrompt(modelData, userPrompt) {
  const { attributes, facialFeatures, age } = modelData;

  let promptParts = [];

  // Parse the user's prompt to extract key elements FIRST (before adding to promptParts)
  const lowerPrompt = userPrompt.toLowerCase();

  // Detect composition/framing requests FIRST (before other logic)
  let composition = 'head and shoulders visible';
  let framing = 'face taking up 40% of frame';
  let bodyVisibility = '';
  
  if (lowerPrompt.includes('full body') || lowerPrompt.includes('full-body') || 
      lowerPrompt.includes('head to toe') || lowerPrompt.includes('entire body') ||
      lowerPrompt.includes('whole body') || lowerPrompt.includes('full shot')) {
    composition = 'full body visible, head to toe';
    framing = 'full body shot, entire figure visible';
    bodyVisibility = 'full body framing, standing full body';
  } else if (lowerPrompt.includes('half body') || lowerPrompt.includes('half-body') ||
             lowerPrompt.includes('upper body') || lowerPrompt.includes('upper-body') ||
             lowerPrompt.includes('waist up') || lowerPrompt.includes('torso visible')) {
    composition = 'upper body visible, waist up';
    framing = 'upper body framing, torso visible';
    bodyVisibility = 'half body shot, waist up';
  } else if (lowerPrompt.includes('head and shoulders') || lowerPrompt.includes('headshot') ||
             lowerPrompt.includes('portrait') || lowerPrompt.includes('close-up')) {
    composition = 'head and shoulders visible';
    framing = 'face taking up 40% of frame';
    bodyVisibility = 'portrait framing, head and shoulders';
  }

  // Critical mirror selfie characteristics - ALWAYS FIRST
  // Adjust mirror framing based on composition request
  if (composition.includes('full body') || bodyVisibility.includes('full body')) {
    promptParts.push('full body mirror selfie photo');
    promptParts.push('reflection in full length mirror');
    promptParts.push('person standing in front of full length mirror');
    promptParts.push('viewing full body reflection in mirror');
  } else {
    promptParts.push('mirror selfie photo');
    promptParts.push('reflection in mirror');
    promptParts.push('person standing in front of mirror');
    promptParts.push('viewing reflection in mirror');
  }
  promptParts.push('vertical 9:16 portrait orientation');

  // Subject description with gender
  const gender = attributes?.gender || '';
  let subjectDesc = '';

  if (age && gender) {
    subjectDesc = `${age} year old ${gender}`;
  } else if (age) {
    subjectDesc = `${age} year old person`;
  } else if (gender) {
    subjectDesc = `young adult ${gender}`;
  } else {
    subjectDesc = 'young adult';
  }

  promptParts.push(subjectDesc);

  // Physical attributes - detailed and specific
  if (attributes) {
    // Hair - very specific
    if (attributes.hairColor || attributes.hairStyle || attributes.hairLength) {
      const hairParts = [];
      if (attributes.hairLength) hairParts.push(attributes.hairLength);
      if (attributes.hairStyle) hairParts.push(attributes.hairStyle.toLowerCase());
      if (attributes.hairColor) hairParts.push(attributes.hairColor.toLowerCase());
      if (hairParts.length > 0) {
        promptParts.push(`with ${hairParts.join(' ')} hair`);
      }
    }

    // Eyes
    if (attributes.eyeColor) {
      promptParts.push(`${attributes.eyeColor.toLowerCase()} eyes`);
    }

    // Skin tone
    if (attributes.skinTone) {
      promptParts.push(`${attributes.skinTone.toLowerCase()} skin`);
    }

    // Body type
    if (attributes.bodyType) {
      promptParts.push(`${attributes.bodyType.toLowerCase()} body type`);
    }
  }

  // Facial features - highly detailed
  if (facialFeatures) {
    if (facialFeatures.faceShape) {
      promptParts.push(`${facialFeatures.faceShape.toLowerCase()}-shaped face`);
    }

    if (facialFeatures.eyeShape) {
      promptParts.push(`${facialFeatures.eyeShape.toLowerCase()}-shaped eyes`);
    }

    if (facialFeatures.noseShape) {
      promptParts.push(`${facialFeatures.noseShape.toLowerCase()} nose`);
    }

    if (facialFeatures.lipShape) {
      promptParts.push(`${facialFeatures.lipShape.toLowerCase()} lips`);
    }
  }

  // Extract pose/action from user prompt
  // Check if user specifically mentions phone or camera
  let pose = 'person standing in front of mirror';
  if (lowerPrompt.includes('phone') || lowerPrompt.includes('holding phone') || lowerPrompt.includes('camera')) {
    pose = 'person holding phone at arms length in front of mirror';
  }
  let expression = 'genuine warm smile';
  let lookingAt = 'looking directly at camera';

  // Check for specific poses
  if (lowerPrompt.includes('crouch') || lowerPrompt.includes('crouching') || lowerPrompt.includes('squat')) {
    pose = 'crouching down in front of mirror';
  } else if (lowerPrompt.includes('sitting') || lowerPrompt.includes('sit down')) {
    pose = 'sitting in front of mirror';
  } else if (lowerPrompt.includes('stand') || lowerPrompt.includes('standing')) {
    pose = 'standing in front of mirror';
  } else if (lowerPrompt.includes('lean')) {
    pose = 'leaning casually against mirror';
  }
  
  // Only add phone if explicitly mentioned
  if (lowerPrompt.includes('phone') || lowerPrompt.includes('holding phone')) {
    pose = pose.replace('in front of mirror', 'holding phone in front of mirror');
  }

  // Check for expressions
  if (lowerPrompt.includes('smil') || lowerPrompt.includes('happy') || lowerPrompt.includes('laugh')) {
    expression = 'genuine warm smile, happy expression';
  } else if (lowerPrompt.includes('serious') || lowerPrompt.includes('no smile')) {
    expression = 'serious expression, confident look';
  } else if (lowerPrompt.includes('playful') || lowerPrompt.includes('fun')) {
    expression = 'playful expression, slight smile';
  } else if (lowerPrompt.includes('confident')) {
    expression = 'confident expression, slight smile';
  }

  // Check for camera direction
  if (lowerPrompt.includes('looking at camera') || lowerPrompt.includes('look at camera')) {
    lookingAt = 'looking directly at camera, eye contact with viewer';
  } else if (lowerPrompt.includes('looking away')) {
    lookingAt = 'looking slightly away from camera, candid moment';
  } else if (lowerPrompt.includes('looking down')) {
    lookingAt = 'looking down, candid moment';
  } else {
    // Default - most selfies look at camera
    lookingAt = 'looking directly at camera';
  }

  promptParts.push(pose);
  promptParts.push(expression);
  promptParts.push(lookingAt);
  
  // Add composition/framing details
  if (bodyVisibility) {
    promptParts.push(bodyVisibility);
  }
  promptParts.push(composition);
  promptParts.push(framing);

  // Extract activity/action from user prompt
  if (lowerPrompt.includes('petting') || lowerPrompt.includes('pet ')) {
    if (lowerPrompt.includes('dog')) {
      promptParts.push('petting a friendly dog');
      promptParts.push('hand gently on dog');
      promptParts.push('dog in frame');
    } else if (lowerPrompt.includes('cat')) {
      promptParts.push('petting a cat');
      promptParts.push('cat visible in scene');
    }
  } else if (lowerPrompt.includes('holding') && lowerPrompt.includes('coffee')) {
    promptParts.push('holding a coffee cup in one hand');
  } else if (lowerPrompt.includes('hold') && lowerPrompt.includes('flower')) {
    promptParts.push('holding flowers');
  }

  // Extract and intelligently interpret the setting/environment from user prompt
  let settingDesc = '';

  if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('fancy restaurant') || lowerPrompt.includes('fine dining')) {
    settingDesc = 'in a fancy restaurant';
    promptParts.push(settingDesc);
    promptParts.push('elegant restaurant interior in background');
    promptParts.push('upscale dining atmosphere');
    promptParts.push('restaurant lighting, warm ambient lighting');
    promptParts.push('luxurious restaurant setting');
  } else if (lowerPrompt.includes('coffee shop') || lowerPrompt.includes('cafe')) {
    settingDesc = 'in a cozy coffee shop';
    promptParts.push(settingDesc);
    promptParts.push('cafe interior in background');
    promptParts.push('warm indoor lighting');
    promptParts.push('casual public space atmosphere');
  } else if (lowerPrompt.includes('park')) {
    settingDesc = 'in a park';
    promptParts.push(settingDesc);
    promptParts.push('green trees and grass in background');
    promptParts.push('natural outdoor setting');
    promptParts.push('bright daylight');
  } else if (lowerPrompt.includes('beach')) {
    settingDesc = 'at the beach';
    promptParts.push(settingDesc);
    promptParts.push('sand and ocean in background');
    promptParts.push('bright natural sunlight');
    promptParts.push('coastal atmosphere');
  } else if (lowerPrompt.includes('gym') || lowerPrompt.includes('workout')) {
    settingDesc = 'at the gym';
    promptParts.push(settingDesc);
    promptParts.push('gym equipment in background');
    promptParts.push('fitness environment');
    promptParts.push('wearing athletic clothes');
  } else if (lowerPrompt.includes('bedroom') || lowerPrompt.includes('room')) {
    settingDesc = 'in bedroom';
    promptParts.push(settingDesc);
    promptParts.push('casual home environment');
    promptParts.push('soft indoor lighting');
  } else if (lowerPrompt.includes('outdoor')) {
    settingDesc = 'outdoors';
    promptParts.push(settingDesc);
    promptParts.push('natural outdoor background');
    promptParts.push('daylight');
  } else {
    // Default simple background
    promptParts.push('simple indoor background');
    promptParts.push('soft natural lighting');
  }

  // Lighting based on setting or explicit mention
  if (lowerPrompt.includes('golden hour') || lowerPrompt.includes('sunset')) {
    promptParts.push('golden hour lighting');
    promptParts.push('warm soft glow');
  } else if (lowerPrompt.includes('bright') || lowerPrompt.includes('sunny')) {
    promptParts.push('bright natural lighting');
    promptParts.push('well-lit');
  } else if (!settingDesc) {
    // If no setting was specified, add default lighting
    promptParts.push('soft natural window light');
    promptParts.push('well-lit face');
  }

  // Clothing - extract specific clothing items mentioned
  const clothingKeywords = [
    'pajamas', 'pyjamas', 'pj', 'nightwear', 'nightgown',
    'dress', 'gown', 'outfit', 'clothes', 'clothing',
    'shirt', 'blouse', 'top', 'tank top', 't-shirt', 'tshirt',
    'pants', 'jeans', 'shorts', 'skirt', 'leggings',
    'suit', 'jacket', 'coat', 'hoodie', 'sweatshirt',
    'bikini', 'swimsuit', 'bathing suit',
    'uniform', 'costume', 'outfit'
  ];

  let clothingFound = false;
  
  // FIRST: Check for setting-appropriate clothing requests (e.g., "suitable outfit for beach")
  // This should override model attributes
  if (lowerPrompt.includes('suitable') || lowerPrompt.includes('appropriate') || lowerPrompt.includes('for the') || lowerPrompt.includes('for a')) {
    // Beach/swimwear
    if (lowerPrompt.includes('beach') || lowerPrompt.includes('swim') || settingDesc.includes('beach')) {
      promptParts.push('wearing beachwear, bikini or swimsuit');
      promptParts.push('casual beach clothing');
      clothingFound = true;
    }
    // Restaurant/fancy
    else if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('fancy') || lowerPrompt.includes('fine dining') || settingDesc.includes('restaurant')) {
      promptParts.push('wearing elegant dress or formal attire');
      promptParts.push('fancy restaurant outfit');
      clothingFound = true;
    }
    // Gym/workout
    else if (lowerPrompt.includes('gym') || lowerPrompt.includes('workout') || settingDesc.includes('gym')) {
      promptParts.push('wearing athletic clothes, workout attire');
      clothingFound = true;
    }
    // Coffee shop/casual
    else if (lowerPrompt.includes('coffee') || lowerPrompt.includes('cafe') || settingDesc.includes('coffee')) {
      promptParts.push('wearing casual modern clothing');
      clothingFound = true;
    }
  }
  
  // SECOND: Check for specific clothing mentioned in prompt (like "Hello Kitty pyjamas" or "elegant dress")
  if (!clothingFound) {
    for (const keyword of clothingKeywords) {
      if (lowerPrompt.includes(keyword)) {
        // Extract the clothing description (e.g., "cute Hello Kitty pyjamas" or "elegant dress")
        // Find the keyword and capture surrounding context
        const keywordIndex = lowerPrompt.indexOf(keyword);
        const beforeKeyword = lowerPrompt.substring(Math.max(0, keywordIndex - 40), keywordIndex);
        
        // Try to extract descriptive words before the keyword
        const descriptiveWords = beforeKeyword.split(' ').filter(word => 
          word.length > 2 && !['wearing', 'in', 'with', 'the', 'a', 'an', 'is', 'are', 'be', 'wearing'].includes(word.toLowerCase())
        ).slice(-4); // Last 4 descriptive words (e.g., "elegant", "fancy", "beautiful")
        
        if (descriptiveWords.length > 0) {
          const description = descriptiveWords.join(' ');
          promptParts.push(`wearing ${description} ${keyword}`);
        } else {
          promptParts.push(`wearing ${keyword}`);
        }
        clothingFound = true;
        break;
      }
    }
  }
  
  // THIRD: Infer clothing from setting if user mentioned setting but no specific clothing
  if (!clothingFound && settingDesc) {
    if (settingDesc.includes('beach')) {
      promptParts.push('wearing beachwear, bikini or swimsuit');
      promptParts.push('casual beach clothing');
      clothingFound = true;
    } else if (settingDesc.includes('restaurant') || settingDesc.includes('fancy')) {
      promptParts.push('wearing elegant dress or formal attire');
      clothingFound = true;
    } else if (settingDesc.includes('gym')) {
      promptParts.push('wearing athletic clothes, workout attire');
      clothingFound = true;
    }
  }
  
  // LAST RESORT: Only use model attributes if user didn't specify anything
  if (!clothingFound) {
    if (lowerPrompt.includes('dress')) {
      promptParts.push('wearing a dress');
    } else if (lowerPrompt.includes('casual')) {
      promptParts.push('wearing casual outfit');
    } else if (lowerPrompt.includes('professional') || lowerPrompt.includes('business')) {
      promptParts.push('wearing professional business attire');
    } else {
      // Only use model attributes as absolute last resort
      // But prefer generic casual over model's style if style seems inappropriate
      promptParts.push('wearing casual modern clothing');
    }
  }

  // Mirror selfie quality characteristics (what you see in the mirror)
  promptParts.push('mirror reflection perspective');
  promptParts.push('face in sharp focus');
  promptParts.push('accurate skin tones');
  promptParts.push('realistic lighting');

  // Composition - typical selfie framing
  promptParts.push('centered composition');
  promptParts.push('head and shoulders visible');
  promptParts.push('face taking up 40% of frame');

  // Technical quality markers for mirror selfie
  promptParts.push('high quality photo');
  promptParts.push('crisp modern photo quality');
  promptParts.push('natural photo processing');

  // Final quality - emphasize mirror reflection perspective
  promptParts.push('direct view of mirror reflection');
  promptParts.push('no phone or screen visible');
  promptParts.push('ultra realistic');
  promptParts.push('photorealistic');
  promptParts.push('looks like real person');
  promptParts.push('authentic candid moment');

  // Join all parts with commas
  const fullPrompt = promptParts.join(', ');

  return fullPrompt;
}

module.exports = {
  generatePrompt,
  generateNegativePrompt,
  generateChatPrompt
};
