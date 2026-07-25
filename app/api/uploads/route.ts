import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse, errorResponse } from "@/lib/api-response";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const POST = withApiHandler(async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return errorResponse("No file provided", 400);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Target directory: /public/uploads
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name) || ".png";
  const filename = `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, buffer);

  const publicPath = `/uploads/${filename}`;
  return successResponse({ url: publicPath });
});
