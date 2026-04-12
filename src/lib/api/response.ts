import { NextResponse } from "next/server";
import { ApiError } from "./auth";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page?: number; total?: number; limit?: number };
}

export function apiSuccess<T>(data: T, status = 200, meta?: ApiResponse["meta"]): NextResponse {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function apiCreated<T>(data: T): NextResponse {
  return apiSuccess(data, 201);
}

export function apiError(code: string, message: string, status = 400): NextResponse {
  const body: ApiResponse = {
    success: false,
    error: { code, message },
  };
  return NextResponse.json(body, { status });
}

/**
 * Wrapper para route handlers que captura ApiError e erros genéricos.
 */
export function withErrorHandler(
  handler: (request: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (request: Request, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(
          String(error.statusCode),
          error.message,
          error.statusCode
        );
      }
      console.error("[API]", error);
      return apiError("500", "Erro interno do servidor", 500);
    }
  };
}
