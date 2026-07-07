import { NextRequest, NextResponse } from "next/server";

import { extractWebsiteBrandIntake } from "@/lib/scrape/extractors";
import { fetchHtml } from "@/lib/scrape/fetch-html";
import { rateLimit } from "@/lib/validate";

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 500) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    // Block SSRF targets: localhost, private ranges, and metadata endpoints.
    if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === "[::1]" || host === "::1") return false;
    return true;
  } catch {
    return false;
  }
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
