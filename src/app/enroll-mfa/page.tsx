import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaManager } from "@/components/settings/mfa-manager";
import { authMfa, roleRequiresMfa } from "@/lib/mfa";

/**
 * Forced-enrollment page for privileged roles that don't yet have MFA. Lives at
 * the top level (NOT under the (workspace) route group) on purpose: the
 * (workspace) layout guard redirects required-but-unenrolled users here, so this
 * page must not be behind that same guard or it would loop. It self-guards via
 * requireSession(); on success the flow redirects to /dashboard.
 */
export default async function EnrollMfaPage() {
  const session = await requireSession();

  // Nothing to force if the role doesn't require it or they're already enrolled.
  if (!roleRequiresMfa(session.user.role) || (await authMfa.isEnabled(session.user.id))) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] p-4">
      <Card className="w-full max-w-md rounded-[28px] border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Set up two-factor authentication</CardTitle>
          <CardDescription>
            Your role requires two-factor authentication. Set it up now to continue to PawFlow.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <MfaManager enabled={false} remaining={0} forced />
        </CardContent>
      </Card>
    </main>
  );
}
