import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Idea, User, FilterOptions, SortOptions, ErrorState, LoadingState } from '../types';
import { getFirebaseAuth } from '../config/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Initial state
const initialState: AppState = {
  user: null,
  ideas: [],
  filters: {},
  sort: { field: 'createdAt', direction: 'desc' },
  searchQuery: '',
  error: { hasError: false },
  loading: { isLoading: false },
  offline: false,
};

// Action types
type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_IDEAS'; payload: Idea[] }
  | { type: 'ADD_IDEA'; payload: Idea }
  | { type: 'UPDATE_IDEA'; payload: Idea }
  | { type: 'DELETE_IDEA'; payload: string }
  | { type: 'SET_FILTERS'; payload: FilterOptions }
  | { type: 'SET_SORT'; payload: SortOptions }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ERROR'; payload: ErrorState }
  | { type: 'SET_LOADING'; payload: LoadingState }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_IDEAS':
      return { ...state, ideas: action.payload };
    
    case 'ADD_IDEA':
      return { ...state, ideas: [action.payload, ...state.ideas] };
    
    case 'UPDATE_IDEA':
      return {
        ...state,
        ideas: state.ideas.map(idea =>
          idea.id === action.payload.id ? action.payload : idea
        ),
      };
    
    case 'DELETE_IDEA':
      return {
        ...state,
        ideas: state.ideas.filter(idea => idea.id !== action.payload),
      };
    
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'SET_SORT':
      return { ...state, sort: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_OFFLINE':
      return { ...state, offline: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: { hasError: false } };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
  addIdea: (idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIdea: (id: string, updates: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  setError: (error: Error | string) => void;
  clearError: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const addIdea = (idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newIdea: Idea = {
      ...idea,
      id: Date.now().toString(), // Temporary ID, will be replaced by Firebase
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dispatch({ type: 'ADD_IDEA', payload: newIdea });
  };

  const updateIdea = (id: string, updates: Partial<Idea>) => {
    const existingIdea = state.ideas.find(idea => idea.id === id);
    if (existingIdea) {
      const updatedIdea = {
        ...existingIdea,
        ...updates,
        updatedAt: new Date(),
      };
      dispatch({ type: 'UPDATE_IDEA', payload: updatedIdea });
    }
  };

  const deleteIdea = (id: string) => {
    dispatch({ type: 'DELETE_IDEA', payload: id });
  };

  const setError = (error: Error | string) => {
    const errorState: ErrorState = {
      hasError: true,
      error: error instanceof Error ? error : undefined,
      message: error instanceof Error ? error.message : error,
    };
    dispatch({ type: 'SET_ERROR', payload: errorState });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const setLoading = (isLoading: boolean, message?: string) => {
    dispatch({ type: 'SET_LOADING', payload: { isLoading, loadingMessage: message } });
  };

  // Listen to auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
          lastActiveAt: new Date(),
          preferences: {
            theme: 'system',
            notifications: true,
            aiEnabled: true,
            mapsEnabled: true,
            defaultPriority: 'medium',
            autoCategorize: true,
          },
        };
        dispatch({ type: 'SET_USER', payload: user });
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_OFFLINE', payload: false });
    const handleOffline = () => dispatch({ type: 'SET_OFFLINE', payload: true });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const contextValue: AppContextType = {
    state,
    dispatch,
    addIdea,
    updateIdea,
    deleteIdea,
    setError,
    clearError,
    setLoading,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};