/**
 * Centralized API Configuration
 * 
 * This file contains all API keys and configuration for the app.
 * Replace the placeholder values with your actual API keys.
 */

export const API_CONFIG = {
  // Firebase Configuration
  FIREBASE: {
    // Replace with your Firebase config
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
    // iOS specific
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    // Android specific
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  },

  // OpenAI Configuration
  OPENAI: {
    apiKey: 'YOUR_OPENAI_API_KEY',
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7,
  },

  // Google Maps Configuration
  GOOGLE_MAPS: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    region: 'US',
    language: 'en',
  },

  // App Configuration
  APP: {
    name: 'IdeaTracker',
    version: '1.0.0',
    environment: __DEV__ ? 'development' : 'production',
    enableAI: true,
    enableMaps: true,
    enableAnalytics: true,
  },

  // API Endpoints
  ENDPOINTS: {
    // Add any custom API endpoints here
    baseUrl: 'https://api.ideatracker.com',
    timeout: 10000,
  },
} as const;

// Type definitions for better TypeScript support
export type ApiConfig = typeof API_CONFIG;
export type FirebaseConfig = typeof API_CONFIG.FIREBASE;
export type OpenAIConfig = typeof API_CONFIG.OPENAI;
export type GoogleMapsConfig = typeof API_CONFIG.GOOGLE_MAPS;
export type AppConfig = typeof API_CONFIG.APP;

// Validation function to check if all required keys are set
export const validateApiKeys = (): { isValid: boolean; missingKeys: string[] } => {
  const missingKeys: string[] = [];
  
  // Check Firebase keys
  if (API_CONFIG.FIREBASE.apiKey === 'YOUR_FIREBASE_API_KEY') {
    missingKeys.push('Firebase API Key');
  }
  if (API_CONFIG.FIREBASE.projectId === 'YOUR_PROJECT_ID') {
    missingKeys.push('Firebase Project ID');
  }
  
  // Check OpenAI key
  if (API_CONFIG.OPENAI.apiKey === 'YOUR_OPENAI_API_KEY') {
    missingKeys.push('OpenAI API Key');
  }
  
  // Check Google Maps key
  if (API_CONFIG.GOOGLE_MAPS.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    missingKeys.push('Google Maps API Key');
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
};

// Helper function to get configuration with fallbacks
export const getConfig = () => {
  const validation = validateApiKeys();
  
  return {
    ...API_CONFIG,
    validation,
    isConfigured: validation.isValid,
  };
};