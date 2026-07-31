import { requireSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaManager } from "@/components/settings/mfa-manager";
import { authMfa, roleRequiresMfa } from "@/lib/mfa";

export default async function SecuritySettingsPage() {
  // Any signed-in user manages their OWN second factor here (not owner-only).
  const session = await requireSession();
  const enabled = await authMfa.isEnabled(session.user.id);
  const remaining = enabled ? await authMfa.remainingBackupCodes(session.user.id) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Add a one-time code from an authenticator app on top of your password.
            {roleRequiresMfa(session.user.role)
              ? " Your role requires two-factor authentication."
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaManager enabled={enabled} remaining={remaining} />
        </CardContent>
      </Card>
    </div>
  );
}
