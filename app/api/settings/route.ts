import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/error-handler";
import { successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { settingsUpdateSchema } from "@/utils/zod-schemas";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export const GET = withApiHandler(async () => {
  let [row] = await db.select().from(settings).where(eq(settings.id, 1));

  if (!row) {
    [row] = await db
      .insert(settings)
      .values({
        id: 1,
        appName: "Aiza Heels",
        currency: "PKR",
        taxRate: 0,
        lowStockThreshold: 5,
      })
      .returning();
  }

  return successResponse({
    ...row,
    _id: String(row.id),
    isWhatsAppConfigured: isWhatsAppConfigured(),
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  });
});

export const PUT = withApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const validated = settingsUpdateSchema.parse(body);

  const existing = await db.select().from(settings).where(eq(settings.id, 1));

  let updated;
  if (existing.length === 0) {
    [updated] = await db
      .insert(settings)
      .values({
        id: 1,
        appName: "Aiza Heels",
        currency: "PKR",
        taxRate: 0,
        lowStockThreshold: 5,
        ...validated,
      })
      .returning();
  } else {
    [updated] = await db
      .update(settings)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(settings.id, 1))
      .returning();
  }

  return successResponse({ ...updated, _id: String(updated.id) });
});
