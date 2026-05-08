// Structured error response utility
// Ensures all API errors follow a consistent shape: { error: string; code: string; status: number }
// Usage: return apiError('NOT_FOUND', 'Project not found', 404)

import { NextResponse } from 'next/server';

export type ApiErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR'
    | 'SERVICE_UNAVAILABLE'
    | 'INVALID_FILE'
    | 'FILE_TOO_LARGE';

const defaultStatus: Record<ApiErrorCode, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    INVALID_FILE: 400,
    FILE_TOO_LARGE: 413,
};

export function apiError(
    code: ApiErrorCode,
    message: string,
    status?: number,
    details?: Record<string, unknown>
): NextResponse {
    const httpStatus = status ?? defaultStatus[code];
    return NextResponse.json(
        {
            error: message,
            code,
            ...(details ? { details } : {}),
        },
        { status: httpStatus }
    );
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data, { status });
}
