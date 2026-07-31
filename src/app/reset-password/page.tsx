import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    return (
      <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mt-3 font-heading text-3xl font-semibold text-zinc-900">Reset link required</h1>
          <p className="mt-2 text-sm text-zinc-600">Open the link from your reset email to continue.</p>
          <Link href="/forgot-password" className="mt-6 inline-block text-sm text-[#2f8f86] underline underline-offset-4">
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <h1 className="mt-3 font-heading text-3xl font-semibold text-zinc-900">Choose a new password</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">At least 12 characters, with a mix of letters, numbers, and symbols.</p>

        <Card className="mt-8 w-full rounded-[28px] border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
          <CardContent className="p-6">
            {error ? (
              <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <form action={resetPasswordAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700">New password</label>
                <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm" className="text-sm font-medium text-zinc-700">Confirm password</label>
                <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} />
              </div>
              <Button type="submit" className="w-full rounded-full bg-[#79c6bf] py-6 text-zinc-900 hover:bg-[#68b7af]">
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
        <Link href="/login" className="mt-6 text-sm text-zinc-500 underline underline-offset-4">
          Back to log in
        </Link>
      </div>
    </main>
  );
}
