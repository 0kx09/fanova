# Fanova - AI Model Creator

A modern web application for creating AI-generated models with customizable features.

## Features

- **User Registration**: Create an account to get started
- **Model Information**: Input basic model details (name, age, height, etc.)
- **Model Attributes**: Define physical characteristics (hair, eyes, style, etc.)
- **Two Generation Methods**:
  - **Upload Reference Images**: Upload 3 photos for accurate generation
  - **Describe Your Model**: Customize facial features including:
    - Face shape (10 options)
    - Eye shape (9 options)
    - Nose shape (7 options)
    - Lip shape (9 options)
    - Pose options
    - Expression options
    - Lighting options
- **Free Image Generation**: Generate 3 images free of charge

## Project Structure

```
Fanova/
├── public/
│   └── index.html
├── src/
│   ├── pages/
│   │   ├── Register.js
│   │   ├── Register.css
│   │   ├── ModelInfo.js
│   │   ├── ModelInfo.css
│   │   ├── ModelAttributes.js
│   │   ├── ModelAttributes.css
│   │   ├── GenerationChoice.js
│   │   ├── GenerationChoice.css
│   │   ├── FacialFeatures.js
│   │   ├── FacialFeatures.css
│   │   ├── GenerateResults.js
│   │   └── GenerateResults.css
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
└── package.json
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## User Flow

1. **Register** - Create an account
2. **Model Info** - Enter basic model information
3. **Model Attributes** - Define physical characteristics
4. **Generation Choice** - Choose between uploading images or describing features
5. **Facial Features** (if describing) - Customize detailed facial features
6. **Results** - View and download your generated images

## Technologies Used

- React 18
- React Router DOM 6
- CSS3 with custom properties
- LocalStorage for data persistence

## Notes

This is a frontend-only implementation. The image generation is simulated with placeholder images. To make this production-ready, you'll need to:

1. Connect to a backend API for user authentication
2. Integrate with an AI image generation service (e.g., Stable Diffusion, DALL-E)
3. Add proper form validation
4. Implement payment processing for premium features
5. Add a database for storing user data and generated images

## Future Enhancements

- User authentication with JWT
- Backend API integration
- Real AI image generation
- User dashboard
- Image history
- Premium subscription features
- Social sharing
- Model portfolio export
