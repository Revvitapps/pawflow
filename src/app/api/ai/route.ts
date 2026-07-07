import { NextResponse } from "next/server";

import { runAiAction } from "@/lib/actions";
import { rateLimit, requireObject, requireOneOf, validationResponse } from "@/lib/validate";

const ALLOWED_TASKS = [
  "summarizeDay",
  "summarizeIntakeRequest",
  "generateCustomerReply",
  "generateReadyForPickupMessage",
  "generateReviewRequest",
  "generateReviewReply",
  "generateReactivationMessage",
  "classifyInboundMessage",
  "generateMissedCallTextBack",
  "answerReceptionistQuestion",
] as const;

export async function POST(request: Request) {
  const limited = rateLimit(request, "ai", { capacity: 30, refillPerMinute: 30 });
  if (limited) return limited;

  const raw = await request.text();
  if (raw.length > 100_000) {
    return NextResponse.json({ error: "Payload too large (100KB max)." }, { status: 413 });
  }

  let task: (typeof ALLOWED_TASKS)[number];
  let payload: Record<string, unknown>;
  try {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const body = requireObject(parsed, "body");
    task = requireOneOf(body.task, "task", ALLOWED_TASKS);
    payload = requireObject(body.payload, "payload");
  } catch (error) {
    return validationResponse(error);
  }

  try {
    const output = await runAiAction(task, payload);
    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
