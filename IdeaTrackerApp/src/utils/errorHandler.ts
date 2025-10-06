// Centralized Error Handling Utility
// Provides consistent error handling and user-friendly error messages

import { Alert } from 'react-native';
import { createLogger } from './logger';

const log = createLogger('ErrorHandler');

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
}

export class IdeaTrackerError extends Error {
  public code: string;
  public userMessage: string;
  public details?: any;

  constructor(code: string, message: string, userMessage: string, details?: any) {
    super(message);
    this.name = 'IdeaTrackerError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

// Error codes and their user-friendly messages
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  OFFLINE_ERROR: 'OFFLINE_ERROR',
  
  // Authentication errors
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  
  // API errors
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  
  // Data errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  
  // System errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.NETWORK_ERROR]: 'Please check your internet connection and try again.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'The request took too long. Please try again.',
  [ERROR_CODES.OFFLINE_ERROR]: 'You appear to be offline. Please check your connection.',
  [ERROR_CODES.AUTH_ERROR]: 'Authentication failed. Please sign in again.',
  [ERROR_CODES.PERMISSION_ERROR]: 'Permission denied. Please check your settings.',
  [ERROR_CODES.API_ERROR]: 'Service temporarily unavailable. Please try again later.',
  [ERROR_CODES.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment and try again.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.NOT_FOUND_ERROR]: 'The requested item was not found.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
  [ERROR_CODES.CONFIG_ERROR]: 'Configuration error. Please check your settings.',
};

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Create a standardized error
  public createError(
    code: string,
    message: string,
    userMessage?: string,
    details?: any
  ): IdeaTrackerError {
    const finalUserMessage = userMessage || ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
    
    return new IdeaTrackerError(code, message, finalUserMessage, details);
  }

  // Handle and log errors
  public handleError(error: any, context?: string): IdeaTrackerError {
    let appError: IdeaTrackerError;

    if (error instanceof IdeaTrackerError) {
      appError = error;
    } else {
      // Convert unknown errors to standardized format
      appError = this.convertToAppError(error);
    }

    // Log the error
    log.error(`Error in ${context || 'unknown context'}`, {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      stack: error.stack,
    });

    return appError;
  }

  // Show error to user
  public showError(error: IdeaTrackerError, title: string = 'Error'): void {
    Alert.alert(title, error.userMessage);
  }

  // Handle and show error in one call
  public handleAndShowError(error: any, title: string = 'Error', context?: string): void {
    const appError = this.handleError(error, context);
    this.showError(appError, title);
  }

  // Convert various error types to standardized format
  private convertToAppError(error: any): IdeaTrackerError {
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return this.createError(ERROR_CODES.NETWORK_ERROR, error.message);
    }

    // Timeout errors
    if (error.code === 'TIMEOUT_ERROR' || error.message?.includes('timeout')) {
      return this.createError(ERROR_CODES.TIMEOUT_ERROR, error.message);
    }

    // Firebase errors
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      return this.createError(ERROR_CODES.OFFLINE_ERROR, error.message);
    }

    if (error.code === 'permission-denied') {
      return this.createError(ERROR_CODES.PERMISSION_ERROR, error.message);
    }

    if (error.code === 'auth/network-request-failed') {
      return this.createError(ERROR_CODES.NETWORK_ERROR, error.message);
    }

    // API errors
    if (error.status === 429) {
      return this.createError(ERROR_CODES.RATE_LIMIT_ERROR, error.message);
    }

    if (error.status >= 400 && error.status < 500) {
      return this.createError(ERROR_CODES.API_ERROR, error.message);
    }

    if (error.status >= 500) {
      return this.createError(ERROR_CODES.API_ERROR, error.message);
    }

    // Default to unknown error
    return this.createError(ERROR_CODES.UNKNOWN_ERROR, error.message || 'Unknown error occurred');
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: any, context?: string): IdeaTrackerError => {
  return errorHandler.handleError(error, context);
};

export const showError = (error: IdeaTrackerError, title?: string): void => {
  errorHandler.showError(error, title);
};

export const handleAndShowError = (error: any, title?: string, context?: string): void => {
  errorHandler.handleAndShowError(error, title, context);
};

// Async error wrapper
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: string,
  showToUser: boolean = false
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const appError = handleError(error, context);
    
    if (showToUser) {
      showError(appError);
    }
    
    return null;
  }
};

export default errorHandler;
