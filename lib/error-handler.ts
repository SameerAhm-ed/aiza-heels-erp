import { ZodError } from "zod";
import { errorResponse, validationErrorResponse } from "./api-response";
import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
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
        // Zod v4 renamed ZodError.errors -> ZodError.issues; `.errors` no longer
        // exists, so this branch previously threw on every single validation
        // failure (TypeError: Cannot read properties of undefined (reading
        // 'forEach')), turning what should be a clean 400 into an uncaught 500
        // with an empty body for every invalid request across the whole app.
        const fieldErrors: Record<string, string[]> = {};
        error.issues.forEach((err) => {
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

        // SQLite unique-constraint violations (duplicate name/SKU/invoice number, etc.)
        // bubble up from the driver as generic Errors — detect them here instead of
        // leaking the raw SQL statement + params to the client as a 500.
        const causeMessage = (error as { cause?: { message?: string } }).cause?.message ?? "";
        const combinedMessage = `${error.message} ${causeMessage}`;
        const uniqueMatch = combinedMessage.match(
          /UNIQUE constraint failed: (\w+)\.(\w+)/
        );
        if (uniqueMatch) {
          const [, table, column] = uniqueMatch;
          const friendlyField = column.replace(/_/g, " ");
          console.error("[API Error] Unique constraint violation", table, column);
          return errorResponse(
            `A record with this ${friendlyField} already exists`,
            409
          );
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
