import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <h1 className="mt-3 font-heading text-3xl font-semibold text-zinc-900">Reset your password</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Enter your email and we&apos;ll send a secure reset link.
        </p>

        <Card className="mt-8 w-full rounded-[28px] border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
          <CardContent className="p-6">
            {sent ? (
              <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {sent}
              </p>
            ) : null}
            <form action={forgotPasswordAction} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <Button type="submit" className="w-full rounded-full bg-[#79c6bf] py-6 text-zinc-900 hover:bg-[#68b7af]">
                Send reset link
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
