/**
 * Data Layer Error Types
 * 
 * Custom typed errors for the data layer.
 * All errors extend AppError with code, message, details, and optional status.
 */

export type ErrorCode = 'not_found' | 'validation' | 'auth' | 'network' | 'conflict' | 'quota_exceeded' | 'unknown';

/**
 * Base application error
 */
export class AppError extends Error {
  code: ErrorCode;
  details?: unknown;
  status?: number;

  constructor(code: ErrorCode, message: string, details?: unknown, status?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.status = status;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, details?: unknown) {
    const message = id 
      ? `${resource} with id "${id}" not found`
      : `${resource} not found`;
    super('not_found', message, details, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('validation', message, details, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super('auth', message, details, 401);
    this.name = 'AuthError';
  }
}

/**
 * Network error (for HTTP operations)
 */
export class NetworkError extends AppError {
  retryAfter?: number;

  constructor(message: string, details?: unknown, retryAfter?: number) {
    super('network', message, details, 503);
    this.name = 'NetworkError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Conflict error (e.g., duplicate import, concurrent modification)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('conflict', message, details, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Quota exceeded error (localStorage limit)
 */
export class QuotaExceededError extends AppError {
  constructor(message: string = 'Storage quota exceeded', details?: unknown) {
    super('quota_exceeded', message, details, 413);
    this.name = 'QuotaExceededError';
  }
}

