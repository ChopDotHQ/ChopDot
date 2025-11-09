/**
 * API Client
 * 
 * HTTP client wrapper for future backend API calls.
 * Currently a placeholder - will be implemented when backend is ready.
 * 
 * Features:
 * - Centralized headers (bearer token, content-type)
 * - Error handling and retries
 * - Request/response transformation (future)
 */

import { NetworkError, AuthError } from '../errors';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

/**
 * API Client for HTTP requests
 * 
 * @example
 * ```ts
 * const client = new ApiClient('https://api.chopdot.com');
 * const pots = await client.request<Pot[]>('/api/pots');
 * ```
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null): void {
    if (token) {
      this.defaultHeaders = {
        ...this.defaultHeaders,
        Authorization: `Bearer ${token}`,
      };
    } else {
      const { Authorization, ...rest } = this.defaultHeaders as Record<string, string>;
      this.defaultHeaders = rest;
    }
  }

  /**
   * Make HTTP request
   * 
   * @param path - API endpoint path (e.g., '/api/pots')
   * @param options - Request options (method, body, headers, etc.)
   * @returns Promise resolving to response data
   * @throws {NetworkError} On network failures
   * @throws {AuthError} On authentication failures
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeout = 30000, ...fetchOptions } = options;

    // Build URL with query params
    const url = new URL(path, this.baseUrl || window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Merge headers
    const headers = new Headers({
      ...this.defaultHeaders,
      ...fetchOptions.headers,
    });

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url.toString(), {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle auth errors
      if (response.status === 401) {
        throw new AuthError('Authentication required');
      }

      // Handle network errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new NetworkError(
          `Request failed: ${response.status} ${response.statusText}`,
          { status: response.status, body: errorText }
        );
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof AuthError || error instanceof NetworkError) {
        throw error;
      }

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('Request timeout', { timeout });
      }

      // Handle fetch errors (network failure)
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed',
        { originalError: error }
      );
    }
  }

  /**
   * GET request shorthand
   */
  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request shorthand
   */
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request shorthand
   */
  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request shorthand
   */
  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

