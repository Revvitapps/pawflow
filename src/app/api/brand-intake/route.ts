import { NextRequest, NextResponse } from "next/server";

import { extractWebsiteBrandIntake } from "@/lib/scrape/extractors";
import { fetchHtml } from "@/lib/scrape/fetch-html";

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const normalizedUrl = normalizeUrl(body.url || "");

  if (!normalizedUrl) {
    return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
  }

  try {
    const html = await fetchHtml(normalizedUrl);
    const intake = extractWebsiteBrandIntake(normalizedUrl, html);
    return NextResponse.json(intake);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not pull website details.",
      },
      { status: 400 },
    );
  }
}
