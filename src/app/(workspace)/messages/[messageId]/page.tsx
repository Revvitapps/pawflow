import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ messageId: string }>;
}) {
  const session = await requireSession();
  const { messageId } = await params;
  const message = await db.getNotification(session.user.businessId, messageId);
  if (!message) notFound();

  return (
    <div className="space-y-4">
      <Link href="/messages" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="size-4" /> All messages
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{message.subject || message.client?.name || "Message"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{message.status}</Badge>
            <Badge variant="outline">{message.channel}</Badge>
          </div>
          <p>To: {message.client?.name ?? "Broadcast"}</p>
          <p className="whitespace-pre-wrap text-zinc-800">{message.body}</p>
          <p className="text-xs text-zinc-400">
            {message.sentAt ? `Sent ${new Date(message.sentAt).toLocaleString()}` : `Created ${new Date(message.createdAt).toLocaleString()}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
