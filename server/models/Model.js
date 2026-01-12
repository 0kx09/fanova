const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    min: 18
  },
  height: {
    type: Number
  },
  weight: {
    type: Number
  },
  nationality: {
    type: String,
    trim: true
  },
  occupation: {
    type: String,
    trim: true
  },

  // Attributes
  attributes: {
    hairColor: String,
    hairStyle: String,
    hairLength: String,
    eyeColor: String,
    skinTone: String,
    bodyType: String,
    style: String,
    personality: String
  },

  // Facial Features (if using describe method)
  facialFeatures: {
    faceShape: String,
    eyeShape: String,
    noseShape: String,
    lipShape: String,
    pose: String,
    expression: String,
    lighting: String,
    setting: String  // Custom setting/location where the photo is taken
  },

  // Generation Settings
  generationMethod: {
    type: String,
    enum: ['upload', 'describe'],
    required: true
  },

  // Reference Images (if using upload method)
  referenceImages: [{
    url: String,
    uploadedAt: Date
  }],

  // Generated Images
  generatedImages: [{
    url: String,
    prompt: String,
    generatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Generated Prompt
  fullPrompt: String,

  // User Reference
  userId: {
    type: String,
    required: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  generationCount: {
    type: Number,
    default: 0
  }
});

// Update timestamp on save
modelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Model', modelSchema);
