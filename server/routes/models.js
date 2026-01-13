const express = require('express');
const router = express.Router();
const { generatePrompt, generateNegativePrompt, generateChatPrompt } = require('../utils/promptGenerator');
const { generateImages } = require('../services/imageGenerator');
const { analyzeReferenceImages, generatePromptFromAnalysis } = require('../services/imageAnalyzer');
const { enhancePromptWithOpenAI } = require('../services/promptEnhancer');
const { checkAndDeductForGeneration, getUserProfile } = require('../services/creditService');
const { generateModelName } = require('../services/nameGenerator');
const supabase = require('../config/supabase');

// In-memory storage for testing (no MongoDB)
const modelsStore = new Map();
let idCounter = 1;

/**
 * POST /api/models
 * Create a new model profile
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      age,
      height,
      weight,
      nationality,
      occupation,
      userId
    } = req.body;

    // Validate required fields
    if (!name || !userId) {
      return res.status(400).json({
        error: 'Name and userId are required'
      });
    }

    // Create new model in memory
    const modelId = String(idCounter++);
    const model = {
      id: modelId,
      name,
      age,
      height,
      weight,
      nationality,
      occupation,
      userId,
      attributes: {},
      facialFeatures: {},
      generatedImages: [],
      generationCount: 0,
      createdAt: new Date()
    };

    modelsStore.set(modelId, model);

    res.status(201).json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        age: model.age,
        nationality: model.nationality
      }
    });
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({
      error: 'Failed to create model profile'
    });
  }
});

/**
 * PUT /api/models/:id/attributes
 * Add attributes to a model
 */
router.put('/:id/attributes', async (req, res) => {
  try {
    const { id } = req.params;
    const { attributes } = req.body;

    const model = modelsStore.get(id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    model.attributes = attributes;

    res.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        attributes: model.attributes
      }
    });
  } catch (error) {
    console.error('Error updating attributes:', error);
    res.status(500).json({
      error: 'Failed to update model attributes'
    });
  }
});

/**
 * PUT /api/models/:id/facial-features
 * Add facial features to a model
 */
router.put('/:id/facial-features', async (req, res) => {
  try {
    const { id } = req.params;
    const { facialFeatures } = req.body;

    const model = modelsStore.get(id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    model.facialFeatures = facialFeatures;

    res.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        facialFeatures: model.facialFeatures
      }
    });
  } catch (error) {
    console.error('Error updating facial features:', error);
    res.status(500).json({
      error: 'Failed to update facial features'
    });
  }
});

/**
 * POST /api/models/:id/generate-chat
 * Generate images for a model based on chat prompt
 */
router.post('/:id/generate-chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { userPrompt, numImages = 3, isNsfw = false, options = {} } = req.body;

    if (!userPrompt || typeof userPrompt !== 'string') {
      return res.status(400).json({ error: 'User prompt is required' });
    }

    // Get model from Supabase
    const { data: model, error: fetchError } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Check and deduct credits before generation
    try {
      const creditResult = await checkAndDeductForGeneration(model.user_id, isNsfw, {
        ...options,
        batch: numImages === 3 // Batch generation for 3 images
      });
      
      console.log(`Credits deducted: ${creditResult.cost}, Remaining: ${creditResult.remainingCredits}`);
    } catch (creditError) {
      return res.status(402).json({
        error: creditError.message || 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS'
      });
    }

    // Build model data
    const modelData = {
      age: model.age,
      attributes: model.attributes || {},
      facialFeatures: model.facial_features || {}
    };

    // Try to enhance prompt with OpenAI first
    let prompt;
    try {
      const enhancedPrompt = await enhancePromptWithOpenAI(modelData, userPrompt);
      if (enhancedPrompt) {
        prompt = enhancedPrompt;
        console.log('Using OpenAI-enhanced prompt');
      } else {
        // Fall back to default prompt generation
        prompt = generateChatPrompt(modelData, userPrompt);
        console.log('Using default prompt generation');
      }
    } catch (error) {
      console.error('Error enhancing prompt with OpenAI, using default:', error.message);
      // Fall back to default prompt generation
      prompt = generateChatPrompt(modelData, userPrompt);
      console.log('Using default prompt generation (fallback)');
    }

    const negativePrompt = generateNegativePrompt();

    console.log('User request:', userPrompt);
    console.log('Generated full prompt:', prompt);

    // Generate images
    const imageUrls = await generateImages(prompt, negativePrompt, numImages);

    // NOTE: Do NOT save images automatically here for chat generation
    // Images will be saved when user selects one in the frontend
    // This prevents duplicates and ensures only selected images are saved

    // Update generation count in Supabase (only for tracking, not for saving)
    // We'll update this when the user actually saves an image

    res.json({
      success: true,
      images: imageUrls,
      prompt: userPrompt,
      fullPrompt: prompt,
      model: {
        id: model.id,
        name: model.name,
        generationCount: (model.generation_count || 0) + numImages
      }
    });
  } catch (error) {
    console.error('Error generating images from chat:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate images'
    });
  }
});

/**
 * POST /api/models/:id/generate
 * Generate images for a model
 */
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const { numImages = 3, referenceImages } = req.body;

    console.log(`[Generate] Request for model ${id}, numImages: ${numImages}`);

    // Try to get model from Supabase first
    let model;
    let fetchError;
    try {
      const result = await supabase
        .from('models')
        .select('*')
        .eq('id', id)
        .single();
      model = result.data;
      fetchError = result.error;
    } catch (err) {
      console.error('Error fetching model from Supabase:', err);
      fetchError = err;
    }

    if (fetchError || !model) {
      // Fallback to in-memory store for backwards compatibility
      const memoryModel = modelsStore.get(id);
      if (!memoryModel) {
        console.error(`[Generate] Model ${id} not found in Supabase or memory`);
        return res.status(404).json({ error: 'Model not found' });
      }

      // Use in-memory model
      const prompt = generatePrompt(memoryModel);
      const negativePrompt = generateNegativePrompt();

      console.log('Generated prompt:', prompt);

      try {
        const imageUrls = await generateImages(prompt, negativePrompt, numImages);

        const generatedImages = imageUrls.map(url => ({
          url,
          prompt,
          generatedAt: new Date()
        }));

        memoryModel.generatedImages.push(...generatedImages);
        memoryModel.generationCount += numImages;
        memoryModel.fullPrompt = prompt;

        return res.json({
          success: true,
          images: imageUrls,
          prompt: prompt,
          model: {
            id: memoryModel.id,
            name: memoryModel.name,
            generationCount: memoryModel.generationCount
          }
        });
      } catch (genError) {
        console.error('Error generating images for memory model:', genError);
        return res.status(500).json({
          error: genError.message || 'Failed to generate images'
        });
      }
    }

    let prompt;
    const negativePrompt = generateNegativePrompt();

    // Check if reference images are provided
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      console.log(`Analyzing ${referenceImages.length} reference images...`);

      try {
        // Analyze reference images using Gemini Vision
        const analysis = await analyzeReferenceImages(referenceImages);
        console.log('Analysis complete:', analysis);

        // Save the analysis to the model
        await supabase
          .from('models')
          .update({
            analyzed_features: analysis
          })
          .eq('id', id);

        // Generate prompt from analysis, using any additional attributes from the model
        prompt = generatePromptFromAnalysis(analysis, model.attributes || {});
        console.log('Generated prompt from reference images:', prompt);
      } catch (analysisError) {
        console.error('Error analyzing reference images:', analysisError);
        // Fallback to describe method
        const modelData = {
          age: model.age,
          attributes: model.attributes || {},
          facialFeatures: model.facial_features || {}
        };
        prompt = generatePrompt(modelData);
        console.log('Using fallback prompt from model attributes');
      }
    } else {
      // No reference images - use describe method
      const modelData = {
        age: model.age,
        attributes: model.attributes || {},
        facialFeatures: model.facial_features || {}
      };

      prompt = generatePrompt(modelData);
      console.log('Generated prompt from model attributes:', prompt);
    }

    // Check and deduct credits before generation (for Supabase models only)
    try {
      const creditResult = await checkAndDeductForGeneration(model.user_id, false, {
        batch: numImages === 3 // Batch generation for 3 images
      });
      
      console.log(`Credits deducted: ${creditResult.cost}, Remaining: ${creditResult.remainingCredits}`);
    } catch (creditError) {
      console.error('Credit check/deduction error:', creditError);
      return res.status(402).json({
        error: creditError.message || 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS'
      });
    }

    // Generate images
    let imageUrls;
    try {
      imageUrls = await generateImages(prompt, negativePrompt, numImages);
      console.log(`Successfully generated ${imageUrls.length} images`);
    } catch (genError) {
      console.error('Error generating images:', genError);
      // Try to refund credits if generation fails
      // (This is a simplified approach - in production you might want more sophisticated rollback)
      return res.status(500).json({
        error: genError.message || 'Failed to generate images. Please try again.',
        code: 'GENERATION_FAILED'
      });
    }

    // Update generation count in Supabase
    try {
      await supabase
        .from('models')
        .update({
          generation_count: (model.generation_count || 0) + numImages
        })
        .eq('id', id);
    } catch (updateError) {
      console.error('Error updating generation count:', updateError);
      // Don't fail the request if this update fails
    }

    res.json({
      success: true,
      images: imageUrls,
      prompt: prompt,
      model: {
        id: model.id,
        name: model.name,
        generationCount: (model.generation_count || 0) + numImages
      }
    });
  } catch (error) {
    console.error('❌ Unexpected error in generate route:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to generate images',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/models/:id
 * Get a specific model by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get model from Supabase first
    // Fetch model and images separately to avoid timeout
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .single();

    if (modelError || !model) {
      // Fallback to in-memory store for backwards compatibility
      const memoryModel = modelsStore.get(id);
      if (!memoryModel) {
        return res.status(404).json({ error: 'Model not found' });
      }

      return res.json({
        success: true,
        model: memoryModel
      });
    }

    // Fetch images separately with limit to prevent timeout
    const { data: images, error: imagesError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('model_id', id)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to most recent 100 images

    // Format the response to match expected structure
    res.json({
      success: true,
      model: {
        ...model,
        generated_images: imagesError ? [] : (images || [])
      }
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({
      error: 'Failed to fetch model',
      message: error.message
    });
  }
});

/**
 * GET /api/models/user/:userId
 * Get all models for a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const models = Array.from(modelsStore.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      models
    });
  } catch (error) {
    console.error('Error fetching user models:', error);
    res.status(500).json({
      error: 'Failed to fetch models'
    });
  }
});

/**
 * DELETE /api/models/:id
 * Delete a model
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = modelsStore.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({
      error: 'Failed to delete model'
    });
  }
});

/**
 * POST /api/models/generate-name
 * Generate a model name using AI
 */
router.post('/generate-name', async (req, res) => {
  try {
    const { nationality, occupation, gender } = req.body;

    console.log('Generating model name with context:', { nationality, occupation, gender });

    const generatedName = await generateModelName({
      nationality,
      occupation,
      gender
    });

    res.json({ 
      success: true, 
      name: generatedName 
    });
  } catch (error) {
    console.error('Error generating model name:', error);
    res.status(500).json({ 
      error: 'Failed to generate name',
      message: error.message 
    });
  }
});

module.exports = router;
