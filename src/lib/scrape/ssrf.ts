/**
 * SSRF guard for the brand-intake website fetcher. Shared by the route (initial
 * URL) and the fetcher (every redirect hop), so a public URL that 30x-redirects
 * to an internal target is rejected mid-flight instead of being followed.
 */

function isPrivateIpv4(host: string): boolean {
  // Loopback, RFC1918, link-local (incl. cloud metadata 169.254.169.254),
  // CGNAT, "this network" (0.0.0.0/8), and benchmark ranges.
  if (/^(0\.|127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return true; // 100.64.0.0/10
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true; // unique local fc00::/7
  // IPv4-mapped (::ffff:169.254.x.x etc.)
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped && isPrivateIpv4(mapped[1]!)) return true;
  return false;
}

export function isSafePublicUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  // Reject embedded credentials (user:pass@host) — a common SSRF/abuse vector.
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (!host) return false;

  // Hostname-based internal targets.
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (host === "metadata" || host === "metadata.google.internal") return false;

  // Literal IPv4.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && isPrivateIpv4(host)) return false;
  // Decimal / octal / hex integer IPs (e.g. 2130706433 == 127.0.0.1).
  if (/^0x[0-9a-f]+$/.test(host) || /^\d{8,10}$/.test(host)) return false;

  // Literal IPv6 (URL keeps brackets in hostname only for some engines).
  if (host.includes(":") && isPrivateIpv6(host)) return false;
  if (url.hostname.startsWith("[") && isPrivateIpv6(url.hostname)) return false;

  return true;
}
