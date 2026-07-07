"use client";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center">
      <h1 className="font-heading text-3xl font-semibold text-zinc-900">Something went wrong</h1>
      <p className="max-w-md text-sm leading-6 text-zinc-600">An unexpected error occurred. Please try again.</p>
      {error.digest ? <p className="text-xs text-zinc-400">Reference: {error.digest}</p> : null}
      <button className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
