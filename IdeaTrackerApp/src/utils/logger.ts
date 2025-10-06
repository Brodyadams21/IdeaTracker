// Centralized Logging Utility
// Provides consistent logging across the app with different log levels

import { config } from '../config/env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  source: string;
}

class Logger {
  private minLevel: LogLevel;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = config.debugMode;
    this.minLevel = config.debugMode ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.isEnabled && level >= this.minLevel;
  }

  private formatMessage(level: LogLevel, source: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const prefix = `[${timestamp}] [${levelName}] [${source}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, source: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, source, message, data);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(source: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, source, message, data);
  }

  info(source: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, source, message, data);
  }

  warn(source: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, source, message, data);
  }

  error(source: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, source, message, data);
  }

  // Performance logging
  time(label: string): void {
    if (this.isEnabled) {
      console.time(`[PERF] ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.isEnabled) {
      console.timeEnd(`[PERF] ${label}`);
    }
  }

  // Group logging for related operations
  group(label: string): void {
    if (this.isEnabled) {
      console.group(`[GROUP] ${label}`);
    }
  }

  groupEnd(): void {
    if (this.isEnabled) {
      console.groupEnd();
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export convenience functions for common use cases
export const createLogger = (source: string) => ({
  debug: (message: string, data?: any) => logger.debug(source, message, data),
  info: (message: string, data?: any) => logger.info(source, message, data),
  warn: (message: string, data?: any) => logger.warn(source, message, data),
  error: (message: string, data?: any) => logger.error(source, message, data),
  time: (label: string) => logger.time(`${source}:${label}`),
  timeEnd: (label: string) => logger.timeEnd(`${source}:${label}`),
  group: (label: string) => logger.group(`${source}:${label}`),
  groupEnd: () => logger.groupEnd(),
});

// Export the main logger instance
export default logger;
