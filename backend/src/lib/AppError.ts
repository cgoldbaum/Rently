export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code ?? statusToDefaultCode(status);
    this.details = details;
  }
}

function statusToDefaultCode(status: number): string {
  switch (true) {
    case status === 400:
      return 'VALIDATION_ERROR';
    case status === 401:
      return 'UNAUTHORIZED';
    case status === 403:
      return 'FORBIDDEN';
    case status === 404:
      return 'NOT_FOUND';
    case status === 409:
      return 'CONFLICT';
    case status >= 500:
      return 'INTERNAL_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}
