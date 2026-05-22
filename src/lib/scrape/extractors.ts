import * as cheerio from "cheerio";

import type { SocialLink, WebsiteBrandIntake } from "@/lib/types";

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function absoluteUrl(baseUrl: string, href?: string) {
  if (!href) return "";

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractHours(textBlocks: string[]) {
  return unique(
    textBlocks.filter((text) =>
      /(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday|hours|open|closed)/i.test(
        text,
      ),
    ),
  ).slice(0, 7);
}

function extractServiceHints(textBlocks: string[]) {
  return unique(
    textBlocks.filter((text) =>
      /groom|bath|tidy|trim|deshed|boarding|daycare|nail|spa|puppy|package|service/i.test(text),
    ),
  ).slice(0, 10);
}

function choosePrimaryColor(colors: string[]) {
  return colors.find((color) => /^#[0-9a-f]{6}$/i.test(color)) || "";
}

function chooseLogoUrl(candidates: string[]) {
  if (!candidates.length) return "";

  return candidates
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
    .sort((a, b) => b.score - a.score)[0]?.candidate;
}

export function extractWebsiteBrandIntake(inputUrl: string, html: string): WebsiteBrandIntake {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";
  const headline = $("h1").first().text().trim();

  const textBlocks = unique(
    $("h1, h2, h3, p, li, address")
      .map((_, element) => compactText($(element).text()))
      .get(),
  );

  const logos = unique(
    $('img[src], link[rel="icon"], link[rel="apple-touch-icon"]')
      .map((_, element) => {
        const candidate =
          $(element).attr("src") ||
          $(element).attr("href") ||
          $(element).attr("data-src") ||
          "";
        const alt = $(element).attr("alt") || "";

        if (/logo|brand/i.test(candidate) || /logo|brand/i.test(alt) || candidate.includes("icon")) {
          return absoluteUrl(inputUrl, candidate);
        }

        return "";
      })
      .get(),
  );

  const socialLinks: SocialLink[] = $('a[href*="instagram"], a[href*="facebook"], a[href*="linkedin"], a[href*="youtube"], a[href*="x.com"], a[href*="twitter.com"]')
    .map((_, element) => ({
      label: compactText($(element).text()) || $(element).attr("aria-label") || "Social",
      url: absoluteUrl(inputUrl, $(element).attr("href")),
    }))
    .get();

  const ctas = unique(
    $("a, button")
      .map((_, element) => compactText($(element).text()))
      .get()
      .filter((text) =>
        /book|call|contact|start|quote|schedule|apply|learn|request|reserve|appointment/i.test(text),
      ),
  );

  const trustSignals = unique(
    textBlocks.filter((text) =>
      /trusted|rated|licensed|certified|award|years|family|experience|reviews|clients/i.test(text),
    ),
  ).slice(0, 8);

  const colors = unique(html.match(/#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|hsl\([^)]+\)/g) ?? []).slice(0, 8);

  const businessNameCandidates = unique([
    $('meta[property="og:site_name"]').attr("content") || "",
    title.split("|")[0] || "",
    title.split("-")[0] || "",
    headline.split(" ").slice(0, 6).join(" "),
  ]);

  const businessName = businessNameCandidates[0] || "";

  return {
    normalizedUrl: inputUrl,
    businessName,
    businessSlug: businessName ? slugify(businessName) : "",
    logoUrl: chooseLogoUrl(logos),
    description: metaDescription || textBlocks.find((text) => text.length > 60) || "",
    primaryColor: choosePrimaryColor(colors),
    logos,
    services: extractServiceHints(textBlocks),
    hours: extractHours(textBlocks),
    emails: unique(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
    phones: unique(html.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) ?? []),
    addresses: unique(
      $("address")
        .map((_, element) => compactText($(element).text()))
        .get(),
    ),
    socialLinks,
    ctas,
    trustSignals,
    rawTextSample: $("body").text().replace(/\s+/g, " ").trim().slice(0, 1200),
  };
}
