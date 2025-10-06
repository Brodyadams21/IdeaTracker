// Centralized Type Definitions
// All TypeScript interfaces and types for the IdeaTracker app

// Core Idea Types
export type IdeaCategory = 'location' | 'habit' | 'oneTime' | 'uncategorized';

export interface BaseIdea {
  id: string;
  originalText: string;
  category: IdeaCategory;
  processedText: string;
  title?: string;
  tags: string[];
  createdAt: Date;
  completed: boolean;
  userId: string;
  updatedAt?: Date;
}

export interface LocationIdea extends BaseIdea {
  category: 'location';
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
    placeName?: string;
    searchQuery?: string;
    placeType?: string;
    country?: string;
    city?: string;
  };
}

export interface HabitIdea extends BaseIdea {
  category: 'habit';
  habitDetails: {
    frequency: string;
    targetDays?: number[];
    reminderTime?: string;
    streak?: number;
    duration?: string;
  };
}

export interface OneTimeIdea extends BaseIdea {
  category: 'oneTime';
}

export interface UncategorizedIdea extends BaseIdea {
  category: 'uncategorized';
}

export type Idea = LocationIdea | HabitIdea | OneTimeIdea | UncategorizedIdea;

// Firebase Types
export interface FirebaseIdea extends BaseIdea {
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    placeName?: string;
    searchQuery?: string;
    placeType?: string;
    country?: string;
    city?: string;
  };
  habitDetails?: {
    frequency: string;
    targetDays?: number[];
    reminderTime?: string;
    streak?: number;
    duration?: string;
  };
  metadata?: {
    estimatedTime?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    priority?: 'low' | 'medium' | 'high';
    aiProcessed: boolean;
    processingTime?: number;
    sentiment?: 'excited' | 'neutral' | 'urgent';
    actionVerb?: string;
    cuisine?: string;
    activityType?: string;
  };
}

// Location Service Types
export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  city?: string;
  state?: string;
  country?: string;
  placeType?: string;
  relevance: number;
  distance?: number;
  source: string;
  placeId?: string;
}

export interface LocationSearchResult {
  query: string;
  locations: GeocodedLocation[];
  bestMatch?: GeocodedLocation;
  totalResults: number;
  searchRadius: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// Navigation Types
export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  Lists: undefined;
  Map: undefined;
  IdeaDetail: { idea: FirebaseIdea };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  IdeaDetail: { idea: FirebaseIdea };
};

// UI Types
export interface CategoryConfig {
  icon: string;
  color: string;
  label: string;
}

export interface CategoryStats {
  location: number;
  oneTime: number;
  habit: number;
  uncategorized: number;
}

// Configuration Types
export interface AppConfig {
  openaiApiKey: string;
  googlePlacesApiKey: string;
  googleGeocodingApiKey: string;
  googleMapsApiKey: string;
  mapboxApiKey: string;
  useAI: boolean;
  debugMode: boolean;
  aiTimeout: number;
  maxRetries: number;
  defaultSearchRadius: number;
  maxSearchResults: number;
}

export interface LocationServiceConfig {
  enabled: boolean;
  name: string;
  description: string;
  apiKey?: string;
  priority: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Statistics Types
export interface IdeasStatistics {
  total: number;
  byCategory: {
    location: number;
    habit: number;
    oneTime: number;
  };
  completed: number;
  withAI: number;
  byPlaceType: Record<string, number>;
  byCuisine: Record<string, number>;
  topTags: Record<string, number>;
}

// Map Types
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Component Props Types
export interface ScreenProps {
  navigation: any;
  route?: any;
}

export interface IdeaCardProps {
  idea: FirebaseIdea;
  onPress: (idea: FirebaseIdea) => void;
  onToggleCompletion: (ideaId: string, completed: boolean) => void;
  selected?: boolean;
}

export interface CategoryFilterProps {
  category: string;
  label: string;
  count?: number;
  isActive: boolean;
  onPress: (category: string) => void;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Export all types as a namespace for easier imports
export * from './index';
