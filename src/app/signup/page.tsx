import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getOptionalSession } from "@/lib/session";
import { signupAction } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getOptionalSession();
  if (session?.user?.businessId) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="relative mb-5 h-20 w-20 overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
          <Image src="/paw-flow-logo.png" alt="PawFlow logo" fill className="object-contain" sizes="80px" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-zinc-400">Get started</p>
        <h1 className="mt-3 text-center font-heading text-4xl font-semibold text-zinc-900">Create your business</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Set up your PawFlow workspace in under a minute. You become the owner.
        </p>

        <Card className="mt-8 w-full rounded-[28px] border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
          <CardContent className="p-6">
            {error ? (
              <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <form action={signupAction} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="businessName" className="text-sm font-medium text-zinc-700">Business name</label>
                <Input id="businessName" name="businessName" placeholder="Zion & Co Grooming Lodge" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-zinc-700">Your name</label>
                <Input id="name" name="name" placeholder="Alex Rivera" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700">Password</label>
                <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
                <p className="text-xs text-zinc-400">At least 8 characters.</p>
              </div>
              <Button type="submit" className="w-full rounded-full bg-[#79c6bf] py-6 text-zinc-900 hover:bg-[#68b7af]">
                Create business
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-zinc-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[#2f8f86] underline underline-offset-4">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
        <Link href="/" className="mt-6 text-sm text-zinc-500 underline underline-offset-4">
          Back home
        </Link>
      </div>
    </main>
  );
}
