// Environment Configuration
// This file centralizes all environment variables and configuration

export interface AppConfig {
  // API Keys
  openaiApiKey: string;
  googlePlacesApiKey: string;
  googleGeocodingApiKey: string;
  googleMapsApiKey: string;
  mapboxApiKey: string;
  
  // Feature Flags
  useAI: boolean;
  debugMode: boolean;
  
  // API Settings
  aiTimeout: number;
  maxRetries: number;
  
  // Location Settings
  defaultSearchRadius: number;
  maxSearchResults: number;
}

// Helper to read env from multiple RN-friendly sources
function readEnvVar(name: string, fallback: string = ''): string {
  // 1) @env (react-native-dotenv) - Primary method
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DotEnv = require('@env');
    if (DotEnv && typeof DotEnv[name] === 'string' && DotEnv[name]) {
      return DotEnv[name];
    }
  } catch (e) {
    // Silent fail
  }

  // 2) process.env (for Jest tests and Node.js environments)
  if (typeof process !== 'undefined' && process.env && typeof process.env[name] === 'string' && process.env[name]) {
    return process.env[name] as string;
  }

  return fallback;
}

// Default configuration (values resolved via readEnvVar at runtime)
const defaultConfig: AppConfig = {
  // API Keys - use environment variables for security
  openaiApiKey: readEnvVar('OPENAI_API_KEY', 'YOUR_OPENAI_API_KEY'),
  googlePlacesApiKey: readEnvVar('GOOGLE_PLACES_API_KEY', 'YOUR_GOOGLE_PLACES_API_KEY'),
  googleGeocodingApiKey: readEnvVar('GOOGLE_GEOCODING_API_KEY', 'YOUR_GOOGLE_GEOCODING_API_KEY'),
  googleMapsApiKey: readEnvVar('GOOGLE_MAPS_API_KEY', 'YOUR_GOOGLE_MAPS_API_KEY'),
  mapboxApiKey: readEnvVar('MAPBOX_API_KEY', 'your_mapbox_api_key_here'),

  // Feature Flags
  useAI: (readEnvVar('USE_AI', '') || '').toLowerCase() === 'true' || false,
  debugMode: (readEnvVar('DEBUG_MODE', '') || '').toLowerCase() === 'true' || false, // __DEV__ is handled by React Native bundler

  // API Settings
  aiTimeout: parseInt(readEnvVar('AI_TIMEOUT', '10000'), 10),
  maxRetries: parseInt(readEnvVar('MAX_RETRIES', '2'), 10),

  // Location Settings
  defaultSearchRadius: parseInt(readEnvVar('DEFAULT_SEARCH_RADIUS', '25'), 10),
  maxSearchResults: parseInt(readEnvVar('MAX_SEARCH_RESULTS', '10'), 10),
};

// Validation function
export const validateConfig = (config: AppConfig): string[] => {
  const warnings: string[] = [];
  
  if (config.openaiApiKey === 'YOUR_OPENAI_API_KEY') {
    warnings.push('OpenAI API key not configured - AI features will be disabled');
  }
  
  if (config.googlePlacesApiKey === 'YOUR_GOOGLE_PLACES_API_KEY') {
    warnings.push('Google Places API key not configured - location search may be limited');
  }
  
  if (config.googleGeocodingApiKey === 'YOUR_GOOGLE_GEOCODING_API_KEY') {
    warnings.push('Google Geocoding API key not configured - address search may be limited');
  }
  
  if (config.googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    warnings.push('Google Maps API key not configured - map features may not work');
  }
  
  return warnings;
};

// Get configuration with validation
export const getConfig = (): AppConfig => {
  const config = { ...defaultConfig };
  const warnings = validateConfig(config);
  
  if (config.debugMode && warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:', warnings);
  }
  
  return config;
};

// Export the configuration
export const config = getConfig();

// Helper functions
export const isApiKeyConfigured = (key: string): boolean => {
  return !!key && !key.startsWith('YOUR_') && key.length > 10;
};

export const isFeatureEnabled = (feature: keyof Pick<AppConfig, 'useAI' | 'debugMode'>): boolean => {
  return config[feature];
};

export default config;