import { NextRequest, NextResponse } from "next/server";

import { extractWebsiteBrandIntake } from "@/lib/scrape/extractors";
import { fetchHtml } from "@/lib/scrape/fetch-html";
import { isSafePublicUrl } from "@/lib/scrape/ssrf";
import { rateLimit } from "@/lib/validate";

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 500) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "brand-intake", { capacity: 5, refillPerMinute: 5 });
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const normalizedUrl = normalizeUrl(body.url || "");

  if (!normalizedUrl) {
    return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
  }
  if (!isSafePublicUrl(normalizedUrl)) {
    return NextResponse.json({ error: "That URL can't be scanned." }, { status: 400 });
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
