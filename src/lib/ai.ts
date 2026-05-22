import OpenAI from "openai";

import type { AiTask, DemoWorkspaceState, MissedCallPayload, PortalRequestPayload } from "@/lib/types";

const model = "gpt-4.1-mini";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

async function runPrompt(task: AiTask, prompt: string, fallback: string) {
  const client = getClient();
  if (!client) {
    return fallback;
  }

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are PawFlow, a warm, concise, safety-aware assistant for boutique pet-care businesses. Avoid medical claims. Keep outputs useful and customer-ready.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      metadata: { task },
    });

    return response.output_text || fallback;
  } catch {
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
