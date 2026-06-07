// HTTP-only glue for the route handlers: map domain errors to status codes and build
// JSON responses. This is the ONLY place that knows about HTTP status codes — the domain
// layer speaks in typed errors. Canonical mapping: .claude/core-context/domain-model.md.

import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { DomainError, type DomainErrorCode } from '@/lib/domain/errors';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  VALIDATION: 400,
  EVENT_NOT_FOUND: 404,
  REGISTRATION_NOT_FOUND: 404,
  DUPLICATE_REGISTRATION: 409,
  CAPACITY_EXCEEDED: 409,
  CAPACITY_BELOW_CURRENT: 409,
  PAST_EVENT: 422,
};

/** JSON success response with an explicit status (default 200). */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** 204 No Content — used by unregister, mirroring the service's `void` return. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** 400 for a Zod boundary failure, surfacing field-level issues to the caller. */
export function validationError(error: z.ZodError): NextResponse {
  const issues = error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
  return NextResponse.json(
    { error: { code: 'VALIDATION', message: 'Invalid request', issues } },
    { status: 400 },
  );
}

/** Map a thrown domain error to its canonical HTTP status; anything unexpected -> 500. */
export function mapDomainError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: STATUS_BY_CODE[error.code] },
    );
  }
  console.error('Unhandled error in route handler:', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Internal server error' } },
    { status: 500 },
  );
}

/**
 * Safely read a JSON request body. Returns `undefined` for an absent or malformed body so
 * the shared Zod schema produces a clean 400, rather than an unhandled SyntaxError.
 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return undefined;
  }
}
