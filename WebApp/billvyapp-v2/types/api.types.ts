/**
 * Shapes shared by every backend call. Mirrors the NestJS AllExceptionsFilter,
 * which returns a consistent envelope for all failures.
 */

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  /** A string for thrown exceptions, an array for DTO validation failures. */
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Normalised error surfaced to the UI. The Axios layer converts every failure
 * - HTTP, network, or timeout - into this, so callers never branch on
 * AxiosError internals.
 */
export interface ApiError {
  status: number;
  message: string;
  /** Field-level messages when the backend rejected a DTO. */
  details?: string[];
}

export interface MessageResponse {
  message: string;
}
