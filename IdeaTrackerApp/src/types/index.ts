/**
 * Type definitions for the IdeaTracker app
 */

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  priority: Priority;
  status: IdeaStatus;
  tags: string[];
  location?: Location;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedTime?: number; // in minutes
  aiProcessed: boolean;
  userId: string;
}

export type IdeaCategory = 'location' | 'habit' | 'task';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type IdeaStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  placeId?: string;
}

export interface AIProcessingResult {
  category: IdeaCategory;
  priority: Priority;
  tags: string[];
  estimatedTime?: number;
  confidence: number;
  reasoning?: string;
}

export interface User {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  lastActiveAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  aiEnabled: boolean;
  mapsEnabled: boolean;
  defaultPriority: Priority;
  autoCategorize: boolean;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface TabParamList {
  Home: undefined;
  Capture: undefined;
  Lists: undefined;
  Map: undefined;
  Profile: undefined;
}

export interface StackParamList {
  HomeMain: undefined;
  IdeaDetail: { ideaId: string };
  EditIdea: { ideaId: string };
  Settings: undefined;
  About: undefined;
}

export interface FilterOptions {
  category?: IdeaCategory;
  priority?: Priority;
  status?: IdeaStatus;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
}

export interface SortOptions {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'title' | 'status';
  direction: 'asc' | 'desc';
}

export interface SearchOptions {
  query: string;
  filters: FilterOptions;
  sort: SortOptions;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error;
  message?: string;
  code?: string;
}

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
}

export interface AppState {
  user: User | null;
  ideas: Idea[];
  filters: FilterOptions;
  sort: SortOptions;
  searchQuery: string;
  error: ErrorState;
  loading: LoadingState;
  offline: boolean;
}

// Component Props
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
}

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  elevation?: number;
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  animationType?: 'slide' | 'fade' | 'none';
}

// Service Types
export interface LocationService {
  getCurrentLocation: () => Promise<Location>;
  requestPermission: () => Promise<boolean>;
  watchLocation: (callback: (location: Location) => void) => () => void;
}

export interface AIService {
  categorizeIdea: (idea: string) => Promise<AIProcessingResult>;
  generateTags: (idea: string) => Promise<string[]>;
  estimateTime: (idea: string, category: IdeaCategory) => Promise<number>;
}

export interface DataService {
  saveIdea: (idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Idea>;
  getIdeas: (filters?: FilterOptions) => Promise<Idea[]>;
  updateIdea: (id: string, updates: Partial<Idea>) => Promise<Idea>;
  deleteIdea: (id: string) => Promise<void>;
  searchIdeas: (options: SearchOptions) => Promise<PaginatedResponse<Idea>>;
}