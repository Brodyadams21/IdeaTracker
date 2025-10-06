// Example Configuration File for IdeaTracker
// Copy this file to config.js and fill in your actual values

module.exports = {
  // OpenAI Configuration (Optional - for AI-powered categorization)
  openai: {
    apiKey: 'your_openai_api_key_here',
    enabled: false, // Set to true when you have an API key
  },
  
  // Google Maps Configuration (Optional - for map functionality)
  googleMaps: {
    apiKey: 'your_google_maps_api_key_here',
    enabled: true, // Set to false if you don't have an API key
  },
  
  // App Configuration
  app: {
    debug: true,
    environment: 'development',
  },
  
  // Firebase Configuration
  firebase: {
    // Firebase config is automatically loaded from native config files
    // google-services.json (Android) and GoogleService-Info.plist (iOS)
    enableAnonymousAuth: true,
    enableFirestore: true,
  },
};

// Usage:
// 1. Copy this file to config.js
// 2. Fill in your actual API keys
// 3. Import in your components: const config = require('../config.js');
