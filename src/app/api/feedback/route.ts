import { NextResponse } from "next/server";

import { readFeedbackEntries, saveFeedbackEntries } from "@/lib/feedback-store";
import type { FeedbackEntry } from "@/lib/types";

export async function GET() {
  const entries = await readFeedbackEntries();
  return NextResponse.json({
    entries,
    persisted: entries.length > 0,
  });
}

export async function POST(request: Request) {
  const entry = (await request.json()) as FeedbackEntry;
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
