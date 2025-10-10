export class ProcessingError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = 'PROCESSING_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'ProcessingError';
    this.code = code;
    this.details = details;
  }
}

export const isProcessingError = (error: unknown): error is ProcessingError => {
  return error instanceof ProcessingError;
};
