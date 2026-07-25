import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse } from "@/lib/api-response";
import { getDashboardStats } from "@/services/dashboard.service";

export const GET = withApiHandler(async () => {
  const stats = await getDashboardStats();
  return successResponse(stats);
});
