"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-heading text-2xl font-semibold text-zinc-900">Something went sideways</h2>
      <p className="max-w-md text-sm leading-6 text-zinc-600">
        This page hit an unexpected error. Your workspace data is safe — try again, and if it keeps happening, use the feedback drawer to let us know.
      </p>
      {error.digest ? <p className="text-xs text-zinc-400">Reference: {error.digest}</p> : null}
      <Button className="rounded-full" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
