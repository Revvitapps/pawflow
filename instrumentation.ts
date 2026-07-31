/**
 * Next.js instrumentation hook. This is a SCAFFOLD for error monitoring that is
 * fully gated on the SENTRY_DSN env var: with no DSN set (the default), it is a
 * complete no-op and adds no runtime cost or dependency.
 *
 * To enable: `npm i @sentry/nextjs`, set SENTRY_DSN, and the block below will
 * initialize it. The module name is computed so the bundler does not try to
 * resolve @sentry/nextjs until it is actually installed and enabled.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // disabled unless a DSN is provided

  try {
    const moduleName = ["@sentry", "nextjs"].join("/");
    const Sentry = (await import(/* @vite-ignore */ moduleName)) as {
      init: (opts: Record<string, unknown>) => void;
    };
    Sentry.init({
      dsn,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  } catch {
    // @sentry/nextjs not installed yet — scaffold stays inert.
  }
}
