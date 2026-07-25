/**
 * WhatsApp Cloud API integration.
 * This module is completely self-contained and best-effort:
 * - Credentials are read ONLY from environment variables (never from DB).
 * - A failed send never throws — it logs and returns false.
 * - The module is disabled automatically if credentials aren't configured.
 */

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

function getConfig(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return null; // WhatsApp not configured — silently disabled
  }

  return { accessToken, phoneNumberId };
}

/**
 * Send an invoice PDF to a customer's WhatsApp number.
 * This is fire-and-forget: call without await if you don't want to block.
 *
 * @param customerWhatsappNumber - The customer's WhatsApp number in E.164 format (e.g. +923001234567)
 * @param pdfUrl - Publicly accessible URL to the invoice PDF
 * @param invoiceNumber - Human-readable invoice number for the message caption
 * @returns true if sent successfully, false otherwise
 */
export async function sendInvoicePdf(
  customerWhatsappNumber: string,
  pdfUrl: string,
  invoiceNumber: string
): Promise<boolean> {
  const config = getConfig();

  if (!config) {
    console.log(
      "[WhatsApp] Credentials not configured — skipping invoice send for",
      invoiceNumber
    );
    return false;
  }

  const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: customerWhatsappNumber.replace(/\D/g, ""), // strip non-digits
        type: "document",
        document: {
          link: pdfUrl,
          filename: `${invoiceNumber}.pdf`,
          caption: `Your invoice ${invoiceNumber} is attached. Thank you for your business!`,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[WhatsApp] Send failed for ${invoiceNumber}:`,
        response.status,
        errorBody
      );
      return false;
    }

    console.log(`[WhatsApp] Invoice ${invoiceNumber} sent successfully to ${customerWhatsappNumber}`);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Network error sending ${invoiceNumber}:`, error);
    return false;
  }
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null;
}
