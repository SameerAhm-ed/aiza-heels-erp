import { ZodError } from "zod";
import { errorResponse, validationErrorResponse } from "./api-response";
import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (
  req: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wraps a Next.js route handler with standardized error handling.
 * Catches Zod validation errors and returns field-level 400 responses.
 * Catches all other errors and returns a 500 with the message.
 * This keeps individual route handlers free of try/catch boilerplate.
 */
export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".");
          if (!fieldErrors[field]) fieldErrors[field] = [];
          fieldErrors[field].push(err.message);
        });
        return validationErrorResponse(fieldErrors);
      }

      if (error instanceof Error) {
        // Known business logic errors (stock validation, duplicate keys, etc.)
        if (error.message.startsWith("BUSINESS_ERROR:")) {
          return errorResponse(error.message.replace("BUSINESS_ERROR: ", ""), 400);
        }
        console.error("[API Error]", error.message, error.stack);
        return errorResponse(error.message, 500);
      }

      console.error("[API Error] Unknown error:", error);
      return errorResponse("An unexpected error occurred", 500);
    }
  };
}

/**
 * Throw this from a service to signal a 400-level business rule violation.
 * The error handler above will catch it and return a 400.
 */
export function businessError(message: string): never {
  throw new Error(`BUSINESS_ERROR: ${message}`);
}
