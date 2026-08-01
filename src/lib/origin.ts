import "server-only";
import { headers } from "next/headers";

/**
 * Absolute origin of the current request — used to build the absolute signing
 * links RevSign emails out (`/sign/<token>`). Derived from the request host so
 * links are correct in every environment (local, preview, production) without a
 * hard-coded base URL. Falls back to APP_URL when a host header isn't present.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return process.env.APP_URL ?? "http://localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}
