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

  let task: (typeof ALLOWED_TASKS)[number];
  let payload: Record<string, unknown>;
  try {
    const body = requireObject(await request.json().catch(() => null), "body");
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
