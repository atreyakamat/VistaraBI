export class VistaraError extends Error {
  constructor(message: string, public code: string, public statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DomainClassificationError extends VistaraError {
  constructor(message: string, statusCode = 500) {
    super(message, 'DOMAIN_CLASSIFICATION_ERROR', statusCode);
  }
}

export class KPIComputationError extends VistaraError {
  constructor(message: string, statusCode = 500) {
    super(message, 'KPI_COMPUTATION_ERROR', statusCode);
  }
}

export class UnauthorizedError extends VistaraError {
  constructor(message: string = 'Access denied') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class NotFoundError extends VistaraError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends VistaraError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
