import { NextResponse } from "next/server";

/**
 * All primary-key ids in this app are SQLite autoincrement integers passed
 * through the URL as strings. Route handlers must validate the path param
 * with this before handing it to `Number(id)` — otherwise a non-numeric id
 * (e.g. "abc") produces `NaN`, which reaches the SQL driver as a literal
 * "NaN" parameter and blows up as an unhandled 500 with the raw query text.
 */
export function isValidId(id: string | undefined | null): id is string {
  return !!id && /^\d+$/.test(id);
}

/** Standard API response shape used across all route handlers */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, {
    status,
  });
}

export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201);
}

export function errorResponse(
  message: string,
  status = 500,
  fieldErrors?: Record<string, string[]>
): NextResponse {
  const body: ApiResponse = { success: false, error: message };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return NextResponse.json(body, { status });
}

export function notFoundResponse(entity = "Resource"): NextResponse {
  return errorResponse(`${entity} not found`, 404);
}

export function validationErrorResponse(
  fieldErrors: Record<string, string[]>
): NextResponse {
  return errorResponse("Validation failed", 400, fieldErrors);
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  } satisfies ApiResponse<T[]>);
}
