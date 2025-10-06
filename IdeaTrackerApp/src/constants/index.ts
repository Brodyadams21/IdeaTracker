// Application Constants
// Centralized constants for consistent usage across the app

// Category Configuration
export const CATEGORY_CONFIG = {
  location: { icon: '📍', color: '#FF6B6B', label: 'Location' },
  habit: { icon: '🔄', color: '#4ECDC4', label: 'Habit' },
  oneTime: { icon: '✅', color: '#45B7D1', label: 'One-Time' },
  uncategorized: { icon: '📝', color: '#95A5A6', label: 'Uncategorized' },
} as const;

// UI Constants
export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  shadow: '#000000',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FONT_WEIGHTS = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

// Animation Constants
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

export const ANIMATION_SPRING = {
  tension: 100,
  friction: 8,
} as const;

// Map Constants
export const MAP_CONSTANTS = {
  DEFAULT_REGION: {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  DEFAULT_ZOOM: 0.01,
  SEARCH_RADIUS: 25, // km
  MAX_MARKERS: 50,
} as const;

// API Constants
export const API_CONSTANTS = {
  TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  CACHED_LOCATIONS: 'cached_locations',
  LAST_SYNC: 'last_sync',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_IDEA_LENGTH: 1,
  MAX_IDEA_LENGTH: 500,
  MIN_TITLE_LENGTH: 1,
  MAX_TITLE_LENGTH: 100,
  MAX_TAGS: 10,
} as const;

// Feature Flags
export const FEATURES = {
  AI_PROCESSING: true,
  LOCATION_SERVICES: true,
  OFFLINE_MODE: true,
  ANALYTICS: false,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long. Please try again.',
  OFFLINE_ERROR: 'You appear to be offline. Please check your connection.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  PERMISSION_ERROR: 'Permission denied. Please check your settings.',
  API_ERROR: 'Service temporarily unavailable. Please try again later.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND_ERROR: 'The requested item was not found.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  CONFIG_ERROR: 'Configuration error. Please check your settings.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  IDEA_SAVED: 'Idea saved successfully!',
  IDEA_UPDATED: 'Idea updated successfully!',
  IDEA_DELETED: 'Idea deleted successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
} as const;

// Placeholder Text
export const PLACEHOLDERS = {
  IDEA_INPUT: "Try 'papa johns pizza', 'meditate daily', or 'call mom'...",
  SEARCH_PLACES: 'Search places...',
  SEARCH_IDEAS: 'Search your ideas...',
} as const;

// Default Values
export const DEFAULTS = {
  PAGINATION_LIMIT: 20,
  RECENT_IDEAS_LIMIT: 5,
  SEARCH_RESULTS_LIMIT: 10,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  URL: /^https?:\/\/.+/,
  HASHTAG: /#\w+/g,
  MENTION: /@\w+/g,
} as const;

// Export all constants
export default {
  CATEGORY_CONFIG,
  COLORS,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
  ANIMATION_DURATION,
  ANIMATION_SPRING,
  MAP_CONSTANTS,
  API_CONSTANTS,
  STORAGE_KEYS,
  VALIDATION,
  FEATURES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PLACEHOLDERS,
  DEFAULTS,
  REGEX,
};
