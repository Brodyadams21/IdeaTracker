// Location Service Configuration
// Configure which geocoding services to use and API keys

import { config, isApiKeyConfigured } from './env';

export interface LocationServiceConfig {
  enabled: boolean;
  name: string;
  description: string;
  apiKey?: string;
  priority: number; // Lower number = higher priority
}

export const LOCATION_CONFIG = {
  // Google Places API (best for business searches with proximity)
  GOOGLE_PLACES: {
    enabled: true,
    name: 'Google Places API',
    description: 'Best for business searches with proximity biasing',
    apiKey: config.googlePlacesApiKey,
    priority: 1,
  },
  
  // Google Geocoding API (good for address searches)
  GOOGLE_GEOCODING: {
    enabled: true,
    name: 'Google Geocoding API',
    description: 'Good for address and general location searches',
    apiKey: config.googleGeocodingApiKey,
    priority: 2,
  },
  
  // OpenStreetMap (free fallback)
  OPENSTREETMAP: {
    enabled: true,
    name: 'OpenStreetMap',
    description: 'Free geocoding service - always enabled as fallback',
    priority: 3,
  },
  
  // MapBox (optional premium service)
  MAPBOX: {
    enabled: isApiKeyConfigured(config.mapboxApiKey),
    name: 'MapBox',
    description: 'Premium geocoding service',
    apiKey: config.mapboxApiKey,
    priority: 4,
  },
} as const;

// Helper function to check if a service is properly configured
export const isServiceConfigured = (service: keyof typeof LOCATION_CONFIG): boolean => {
  const config = LOCATION_CONFIG[service];

  if (!config.enabled) {
    console.log(`🔧 ${service}: DISABLED (config.enabled = false)`);
    return false;
  }

  // Check if API key is required and valid
  if (service === 'GOOGLE_PLACES' || service === 'GOOGLE_GEOCODING' || service === 'MAPBOX') {
    const apiKey = (config as any).apiKey;
    const hasApiKey = !!(apiKey && typeof apiKey === 'string');
    const isNotPlaceholder = !apiKey?.startsWith('YOUR_');
    const isLongEnough = apiKey?.length > 10;

    console.log(`🔧 ${service} API Key Check:`, {
      hasApiKey,
      isNotPlaceholder,
      isLongEnough,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined'
    });

    const result = hasApiKey && isNotPlaceholder && isLongEnough;
    console.log(`🔧 ${service}: ${result ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
    return result;
  }

  console.log(`🔧 ${service}: ✅ CONFIGURED (no API key required)`);
  return true;
};

// Validate all API keys and return detailed status
export const validateApiKeys = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  configuredServices: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const configuredServices: string[] = [];

  const servicesToCheck: (keyof typeof LOCATION_CONFIG)[] = ['GOOGLE_PLACES', 'GOOGLE_GEOCODING', 'MAPBOX'];

  servicesToCheck.forEach(serviceKey => {
    const config = LOCATION_CONFIG[serviceKey];
    const apiKey = (config as any).apiKey;

    if (config.enabled) {
      if (!apiKey) {
        errors.push(`${config.name}: API key is missing`);
      } else if (typeof apiKey !== 'string') {
        errors.push(`${config.name}: API key must be a string`);
      } else if (apiKey.startsWith('YOUR_')) {
        errors.push(`${config.name}: API key appears to be a placeholder`);
      } else if (apiKey.length < 10) {
        errors.push(`${config.name}: API key is too short`);
      } else {
        configuredServices.push(config.name);
      }
    } else {
      warnings.push(`${config.name}: Service is disabled`);
    }
  });

  // Check if OpenStreetMap is available as fallback
  if (!LOCATION_CONFIG.OPENSTREETMAP.enabled) {
    warnings.push('OpenStreetMap: Fallback service is disabled - location search may be limited');
  } else {
    configuredServices.push(LOCATION_CONFIG.OPENSTREETMAP.name);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    configuredServices
  };
};

// Get service health status
export const getServiceHealth = async (): Promise<{
  [key: string]: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: Date;
    responseTime?: number;
    error?: string;
  }
}> => {
  const health: any = {};

  for (const service of getEnabledServices()) {
    try {
      const startTime = Date.now();

      // Simple health check - try a basic request
      if (service.key === 'GOOGLE_PLACES') {
        const config = LOCATION_CONFIG.GOOGLE_PLACES;
        if (config.apiKey) {
          const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': config.apiKey
            },
            body: JSON.stringify({ textQuery: 'test' })
          });

          const responseTime = Date.now() - startTime;
          health[service.key] = {
            status: response.ok ? 'healthy' : 'degraded',
            lastChecked: new Date(),
            responseTime,
            error: response.ok ? undefined : `HTTP ${response.status}`
          };
        }
      } else if (service.key === 'OPENSTREETMAP') {
        // Simple OSM health check
        const response = await fetch('https://nominatim.openstreetmap.org/search?q=test&format=json&limit=1');
        const responseTime = Date.now() - startTime;
        health[service.key] = {
          status: response.ok ? 'healthy' : 'degraded',
          lastChecked: new Date(),
          responseTime,
          error: response.ok ? undefined : `HTTP ${response.status}`
        };
      } else {
        // For other services, just mark as healthy if configured
        health[service.key] = {
          status: 'healthy',
          lastChecked: new Date()
        };
      }
    } catch (error) {
      health[service.key] = {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: (error as Error).message
      };
    }
  }

  return health;
};

// Get all enabled services sorted by priority
export const getEnabledServices = () => {
  console.log('🔧 === SERVICE CONFIGURATION CHECK ===');

  const allServices = Object.entries(LOCATION_CONFIG).map(([key, config]) => {
    const configured = isServiceConfigured(key as keyof typeof LOCATION_CONFIG);
    console.log(`🔧 ${key}: enabled=${config.enabled}, configured=${configured}, apiKey=${!!(config as any).apiKey}`);

    return {
      key,
      ...config,
      configured
    };
  });

  const enabledServices = allServices
    .filter(service => service.enabled && service.configured)
    .sort((a, b) => a.priority - b.priority);

  console.log('🔧 Services that passed configuration check:', enabledServices.map(s => `${s.key} (priority: ${s.priority})`));
  console.log('🔧 === SERVICE CONFIGURATION COMPLETE ===');

  return enabledServices;
};

// Get the primary service (highest priority)
export const getPrimaryService = () => {
  const enabled = getEnabledServices();
  return enabled.length > 0 ? enabled[0] : null;
};

export default LOCATION_CONFIG;
