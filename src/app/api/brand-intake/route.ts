import { NextRequest, NextResponse } from "next/server";

import type { WebsiteBrandIntake } from "@/lib/types";

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function cleanText(value?: string) {
  if (!value) return "";
  return value.replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickFirstMatch(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1] || match?.[2];
    if (value) return cleanText(value);
  }
  return "";
}

function resolveAssetUrl(baseUrl: string, candidate?: string) {
  if (!candidate) return "";
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return "";
  }
}

function collectCandidates(html: string, baseUrl: string) {
  const candidates: string[] = [];
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
    /<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]+href=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']*(?:logo|brand|header)[^"']*)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const resolved = resolveAssetUrl(baseUrl, match[1]);
      if (resolved) candidates.push(resolved);
    }
  }

  return [...new Set(candidates)];
}

function chooseLogoUrl(candidates: string[]) {
  if (!candidates.length) return "";

  const scored = candidates
    .map((candidate) => {
      const lower = candidate.toLowerCase();
      let score = 0;
      if (lower.includes("logo")) score += 4;
      if (lower.includes("brand")) score += 3;
      if (lower.includes("header")) score += 2;
      if (lower.includes("icon")) score += 1;
      if (lower.endsWith(".svg")) score += 2;
      if (lower.includes("apple-touch-icon")) score -= 1;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.candidate || "";
}

function extractThemeColor(html: string) {
  const themeColor = pickFirstMatch(html, [
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i,
  ]);

  return /^#[0-9a-f]{3,8}$/i.test(themeColor) ? themeColor : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const normalizedUrl = normalizeUrl(body.url || "");

  if (!normalizedUrl) {
    return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "user-agent": "PawFlow Prototype Intake/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Could not read website (${response.status}).` }, { status: 400 });
    }

    const html = await response.text();
    const businessName = pickFirstMatch(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ])
      .split("|")[0]
      .split("-")[0]
      .trim();

    const description = pickFirstMatch(html, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    ]);

    const logoUrl = chooseLogoUrl(collectCandidates(html, normalizedUrl));
    const primaryColor = extractThemeColor(html);

    const payload: WebsiteBrandIntake = {
      normalizedUrl,
      businessName,
      businessSlug: businessName ? slugify(businessName) : "",
      logoUrl,
      description,
      primaryColor,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        error: "Could not pull website details. The site may block requests or need a different URL.",
      },
      { status: 400 },
    );
  }
}
