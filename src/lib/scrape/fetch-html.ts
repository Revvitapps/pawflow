import { isSafePublicUrl } from "@/lib/scrape/ssrf";

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 3 * 1024 * 1024; // 3 MB cap on the fetched HTML

/**
 * Fetch a page's HTML with a hardened, SSRF-safe redirect policy.
 *
 * `redirect: "follow"` is unsafe here: a public URL can 30x-redirect to an
 * internal target (169.254.169.254, localhost, RFC1918) and the platform fetch
 * would follow it before we ever see the Location. Instead we follow redirects
 * MANUALLY and re-run the SSRF guard on EVERY hop, so each successive URL must
 * independently pass isSafePublicUrl.
 */
export async function fetchHtml(targetUrl: string): Promise<string> {
  let currentUrl = targetUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // Re-validate this hop before making the request.
    if (!isSafePublicUrl(currentUrl)) {
      throw new Error("That URL can't be scanned.");
    }

    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PawFlowBrandIntake/1.0; +https://revvit.io)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    // 3xx: validate the next hop ourselves instead of letting fetch follow it.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect without location from ${currentUrl}`);
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl; // re-validated at the top of the next iteration
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ${currentUrl}: ${response.status}`);
    }

    // Only ingest HTML-ish responses, and cap the body size.
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
      throw new Error("Unsupported content type.");
    }
    return await readCapped(response, MAX_BODY_BYTES);
  }

  throw new Error("Too many redirects.");
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, maxBytes);

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  const buf = new Uint8Array(total > maxBytes ? maxBytes : total);
  let offset = 0;
  for (const chunk of chunks) {
    if (offset + chunk.byteLength > buf.length) {
      buf.set(chunk.subarray(0, buf.length - offset), offset);
      break;
    }
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}
