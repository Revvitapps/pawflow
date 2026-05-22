export async function fetchHtml(targetUrl: string) {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PawFlowBrandIntake/1.0; +https://revvit.io)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${targetUrl}: ${response.status}`);
  }

  return response.text();
}
