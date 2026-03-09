/** Standardized error codes for API responses */
export const ErrorCode = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',

  // External
  GITHUB_ERROR: 'GITHUB_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
