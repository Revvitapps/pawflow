import { del, head, list, put } from "@vercel/blob";

import type { FeedbackEntry } from "@/lib/types";

const FEEDBACK_BLOB_PATH = "pawflow-feedback/entries.json";

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readFeedbackEntries(): Promise<FeedbackEntry[]> {
  if (!hasBlobToken()) {
    return [];
  }

  try {
    await head(FEEDBACK_BLOB_PATH);
    const blobs = await list({ prefix: FEEDBACK_BLOB_PATH, limit: 1 });
    const blob = blobs.blobs[0];
    if (!blob?.url) {
      return [];
    }

    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as FeedbackEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveFeedbackEntries(entries: FeedbackEntry[]) {
  if (!hasBlobToken()) {
    return { persisted: false };
  }

  await del(FEEDBACK_BLOB_PATH).catch(() => undefined);
  await put(FEEDBACK_BLOB_PATH, JSON.stringify(entries, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  return { persisted: true };
}
