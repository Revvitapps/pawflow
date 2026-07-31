import Anthropic from "@anthropic-ai/sdk";

import type { AiTask, DemoWorkspaceState, MissedCallPayload, PortalRequestPayload } from "@/lib/types";
import { enforceCaps, estimateCostUsd, recordUsage } from "@/lib/ai-usage";

// Model is env-overridable; caps pricing knows sonnet-4-6 / opus-5 / opus-4-8 / haiku-4-5.
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT =
  "You are PawFlow, a warm, concise, safety-aware assistant for boutique pet-care businesses. Avoid medical claims. Keep outputs useful and customer-ready.";

function getClient() {
  // Never hardcode a key. No ANTHROPIC_API_KEY => AI features disable gracefully.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new Anthropic({ apiKey });
}

// Core provider primitive. Returns the model's text, or null when AI is
// disabled (no API key). Throws RateLimitError / BudgetExceededError when a cap
// is hit — callers that want graceful degradation should catch and fall back.
export async function askClaude(system: string, prompt: string): Promise<string | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  // Caps are enforced BEFORE the call so a blocked request never reaches the API.
  await enforceCaps();

  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  // Record spend from real usage tokens even on empty/edge responses.
  const cost = estimateCostUsd(
    response.model || model,
    response.usage.input_tokens,
    response.usage.output_tokens,
  );
  await recordUsage(cost);

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  return text || null;
}

async function runPrompt(task: AiTask, prompt: string, fallback: string) {
  try {
    const text = await askClaude(SYSTEM_PROMPT, prompt);
    return text || fallback;
  } catch {
    // Disabled, capped, or upstream error — degrade gracefully to the fallback.
    return fallback;
  }
}


export async function summarizeDay(payload: { workspace: DemoWorkspaceState }) {
  const todayAppointments = payload.workspace.appointments
    .filter((appointment) => appointment.date === new Date().toISOString().slice(0, 10))
    .map((appointment) => `${appointment.startTime} ${appointment.status}`);
  const fallback = `Today is anchored by ${todayAppointments.length} appointments, ${payload.workspace.boardingStays.filter((stay) => stay.status === "checked-in").length} active boarding stays, and ${payload.workspace.missedCalls.length} missed call follow-ups. Prioritize vaccine follow-up for Bella and Luna, and keep Max's late-arrival note visible at the front desk.`;

  return runPrompt(
    "summarizeDay",
    `Summarize today's pet-care operations in 3 concise sentences. Appointments: ${todayAppointments.join(", ")}. Missed calls: ${payload.workspace.missedCalls.length}. Boarding occupancy: ${payload.workspace.boardingStays.length}.`,
    fallback,
  );
}

export async function summarizeIntakeRequest(payload: PortalRequestPayload) {
  const fallback = `${payload.customerName} submitted a ${payload.requestType} request for ${payload.petName}, a ${payload.breed}. They need ${payload.serviceNeeded} around ${payload.preferredDates}. Special notes: ${payload.specialNotes || "none provided"}. Behavior concerns: ${payload.behaviorConcerns || "none provided"}. Vaccine status: ${payload.vaccineStatus}.`;

  return runPrompt(
    "summarizeIntakeRequest",
    `Summarize this intake request for staff review in 2-3 sentences: ${JSON.stringify(payload)}`,
    fallback,
  );
}

export async function generateCustomerReply(payload: { customerName: string; question: string }) {
  const fallback = `Hi ${payload.customerName}, thanks for reaching out. We can help with that and will keep things easy on our side. Share your preferred timing and anything special we should know about your pet, and we'll line up the best next step.`;
  return runPrompt(
    "generateCustomerReply",
    `Write a friendly customer reply for ${payload.customerName}. Question: ${payload.question}`,
    fallback,
  );
}

export async function generateReadyForPickupMessage(payload: { customerName: string; petName: string }) {
  const fallback = `Hi ${payload.customerName}, ${payload.petName} is all set and ready to wag. You can pick up anytime during front-desk hours, and we'll have their notes ready for you.`;
  return runPrompt(
    "generateReadyForPickupMessage",
    `Write a concise ready-for-pickup text for ${payload.customerName} about ${payload.petName}.`,
    fallback,
  );
}

export async function generateReviewRequest(payload: { customerName: string; petName: string; visitType: string }) {
  const fallback = `Hi ${payload.customerName}, thanks for trusting us with ${payload.petName}'s ${payload.visitType}. If everything felt lovely today, we'd be grateful for a quick review.`;
  return runPrompt(
    "generateReviewRequest",
    `Write a review request for ${payload.customerName} after ${payload.petName}'s ${payload.visitType}.`,
    fallback,
  );
}

export async function generateReviewReply(payload: { customerName: string; review: string }) {
  const fallback = `Thank you, ${payload.customerName}. We're so glad the visit felt smooth and well cared for. We can't wait to welcome your pup back soon.`;
  return runPrompt(
    "generateReviewReply",
    `Write a warm public review reply for this customer review from ${payload.customerName}: ${payload.review}`,
    fallback,
  );
}

export async function generateReactivationMessage(payload: { customerName: string; petName: string; lastVisitAt?: string }) {
  const fallback = `Hi ${payload.customerName}, we miss seeing ${payload.petName}. It's been a little while since the last visit${payload.lastVisitAt ? ` on ${payload.lastVisitAt}` : ""}, and we'd love to get their next refresh on the books when you're ready.`;
  return runPrompt(
    "generateReactivationMessage",
    `Write a warm reactivation text for ${payload.customerName} about ${payload.petName}. Last visit: ${payload.lastVisitAt}.`,
    fallback,
  );
}

export async function classifyInboundMessage(payload: { message: string }) {
  const lower = payload.message.toLowerCase();
  const intent =
    lower.includes("board") || lower.includes("overnight")
      ? "boarding"
      : lower.includes("price") || lower.includes("cost")
        ? "pricing"
        : lower.includes("vaccine")
          ? "vaccine"
          : lower.includes("today") || lower.includes("available")
            ? "availability"
            : lower.includes("urgent")
              ? "urgent"
              : lower.includes("groom")
                ? "grooming"
                : "other";
  const fallback = JSON.stringify({
    intent,
    summary: `Inbound request tagged as ${intent}.`,
  });

  return runPrompt(
    "classifyInboundMessage",
    `Classify the customer intent as one of grooming, boarding, pricing, availability, vaccine, urgent, or other. Return JSON with intent and summary. Message: ${payload.message}`,
    fallback,
  );
}

export async function generateMissedCallTextBack(payload: MissedCallPayload) {
  const fallback = `Hi ${payload.customerName}, thanks for calling Zion & Co. Sorry we missed you. We can help with ${payload.message.toLowerCase()}. Send your pet's name, service needed, preferred timing, and any vaccine details if this is for boarding or daycare.`;
  return runPrompt(
    "generateMissedCallTextBack",
    `Write a missed-call text-back for ${payload.customerName}. Their reason: ${payload.message}`,
    fallback,
  );
}

export async function answerReceptionistQuestion(payload: { question: string }) {
  const fallback =
    "Thanks for reaching out. We can help with grooming, boarding, and daycare questions. If you're asking about boarding or daycare, please send your pet's vaccine status, your preferred dates, and any behavior notes so we can guide you safely.";
  return runPrompt(
    "answerReceptionistQuestion",
    `Answer this customer-style receptionist question. Be warm, concise, professional, and safety-aware. Ask for vaccine records when boarding/daycare is discussed. Question: ${payload.question}`,
    fallback,
  );
}
