import type { Message } from "@/lib/types";

export async function sendMessage(message: Omit<Message, "id" | "createdAt" | "status">) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return {
      mode: "mock",
      success: true,
      providerId: `mock_${Date.now()}`,
      preview: message.body,
    };
  }

  return {
    mode: "twilio",
    success: true,
    providerId: `twilio_${Date.now()}`,
    preview: message.body,
  };
}
