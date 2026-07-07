import { NextResponse } from "next/server";

import { readFeedbackEntries, saveFeedbackEntries } from "@/lib/feedback-store";
import type { FeedbackEntry } from "@/lib/types";
import { optionalString, rateLimit, requireObject, requireOneOf, requireString, validationResponse } from "@/lib/validate";

export async function GET() {
  const entries = await readFeedbackEntries();
  return NextResponse.json({
    entries,
    persisted: entries.length > 0,
  });
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "feedback", { capacity: 10, refillPerMinute: 10 });
  if (limited) return limited;

  let entry: FeedbackEntry;
  try {
    const body = requireObject(await request.json().catch(() => null), "body");
    entry = {
      id: requireString(body.id, "id", { max: 64 }),
      route: requireString(body.route, "route", { max: 200 }),
      pageLabel: optionalString(body.pageLabel, "pageLabel", { max: 200 }),
      section: optionalString(body.section, "section", { max: 200 }),
      sentiment: requireOneOf(body.sentiment, "sentiment", ["like", "dislike", "idea"] as const),
      liked: optionalString(body.liked, "liked", { max: 4000 }),
      disliked: optionalString(body.disliked, "disliked", { max: 4000 }),
      suggestion: optionalString(body.suggestion, "suggestion", { max: 4000 }),
      createdAt: new Date().toISOString(),
      source: "local",
    };
  } catch (error) {
    return validationResponse(error);
  }

  const existing = await readFeedbackEntries();
  const next = [entry, ...existing].slice(0, 100);
  const result = await saveFeedbackEntries(next);

  return NextResponse.json({
    entry: {
      ...entry,
      source: result.persisted ? "vercel" : "local",
    },
    persisted: result.persisted,
  });
}
