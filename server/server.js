const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
// Increase limit to 50mb to handle base64 reference images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
const modelsRouter = require('./routes/models');
const stripeRouter = require('./routes/stripe');
app.use('/api/models', modelsRouter);
app.use('/api/stripe', stripeRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fanova API is running (NO DATABASE MODE)' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  console.log(`⚠️  Running in NO DATABASE mode (in-memory storage)`);

  // Check for API keys
  if (process.env.GOOGLE_API_KEY) {
    console.log('✅ Google Imagen API key found');
  } else if (process.env.FAL_AI_KEY) {
    console.log('✅ Fal.ai API key found');
  } else if (process.env.REPLICATE_API_TOKEN) {
    console.log('✅ Replicate API token found');
  } else {
    console.log('⚠️  No image generation API key found in .env');
  }
});

module.exports = app;
