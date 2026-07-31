import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendMessageAction } from "../actions";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;
  const [notifications, clients] = await Promise.all([
    db.listNotifications(session.user.businessId),
    db.listClients(session.user.businessId),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Send a message</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          <form action={sendMessageAction} className="space-y-3">
            <select name="clientId" defaultValue="" className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-700">
              <option value="">No specific client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Input name="subject" placeholder="Subject (optional)" />
            <Textarea name="body" placeholder="Message" required rows={3} />
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message log ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-zinc-500">No messages yet.</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={`/messages/${n.id}`}
                className="block rounded-xl border border-zinc-100 bg-white px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900">
                    {n.client?.name ?? "Broadcast"}{n.subject ? ` · ${n.subject}` : ""}
                  </span>
                  <Badge variant="secondary">{n.status}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{n.body}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
