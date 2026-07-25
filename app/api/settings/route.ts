import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse } from "@/lib/api-response";
import connectDB from "@/lib/db";
import { SettingsModel } from "@/models/settings.model";
import { settingsUpdateSchema } from "@/utils/zod-schemas";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export const GET = withApiHandler(async () => {
  await connectDB();
  let settings = await SettingsModel.findById("main").lean();

  if (!settings) {
    settings = await SettingsModel.create({
      _id: "main",
      appName: "HeelCraft ERP",
      currency: "PKR",
      taxRate: 0,
      lowStockThreshold: 5,
    });
  }

  return successResponse({
    ...settings,
    isWhatsAppConfigured: isWhatsAppConfigured(),
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  });
});

export const PUT = withApiHandler(async (req: NextRequest) => {
  await connectDB();
  const body = await req.json();
  const validated = settingsUpdateSchema.parse(body);

  const updated = await SettingsModel.findByIdAndUpdate("main", validated, {
    new: true,
    upsert: true,
  }).lean();

  return successResponse(updated);
});
