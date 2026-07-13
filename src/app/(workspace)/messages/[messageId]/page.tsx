"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { MessageThread } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function MessageDetailPage() {
  const params = useParams<{ messageId: string }>();
  const { workspace, updateMessage, addMessage, addAiLog, runAiTask } = usePawFlow();
  const [draftReply, setDraftReply] = useState("");

  const message = workspace.messages.find((item) => item.id === params.messageId);
  const customer = workspace.customers.find((item) => item.id === message?.customerId);
  const pet = workspace.pets.find((item) => item.id === message?.petId);

  if (!message) {
    return (
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="p-6">
          <p className="text-sm text-zinc-600">Message record not found in the demo workspace.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Message detail</p>
          <h2 className="font-heading text-3xl font-semibold text-zinc-900">{message.subject}</h2>
        </div>
        <Link href="/messages">
          <Button variant="outline" className="rounded-full">Back to messages</Button>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <MessageThread message={message} />
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Milestones</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Channel · {message.channel}</div>
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Direction · {message.direction}</div>
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Status · {message.status}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Editable message record</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  updateMessage(message.id, {
                    subject: String(formData.get("subject") || ""),
                    body: String(formData.get("body") || ""),
                    sender: String(formData.get("sender") || ""),
                    channel: String(formData.get("channel") || message.channel) as typeof message.channel,
                    status: String(formData.get("status") || message.status) as typeof message.status,
                  });
                }}
              >
                <Input name="subject" defaultValue={message.subject} placeholder="Subject" />
                <Input name="sender" defaultValue={message.sender} placeholder="Sender" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <select name="channel" defaultValue={message.channel} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <option value="sms">sms</option>
                    <option value="email">email</option>
                    <option value="portal">portal</option>
                    <option value="ai-call">ai-call</option>
                  </select>
                  <select name="status" defaultValue={message.status} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <option value="sent">sent</option>
                    <option value="draft">draft</option>
                    <option value="received">received</option>
                  </select>
                </div>
                <Textarea name="body" defaultValue={message.body} placeholder="Message body" />
                <Button className="rounded-full">Save message record</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Reply workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="rounded-full"
                onClick={async () => {
                  const output = await runAiTask("generateCustomerReply", {
                    customerName: customer?.name || message.sender,
                    question: message.body,
                  });
                  addAiLog("generateCustomerReply", message.body, output);
                  setDraftReply(output);
                }}
              >
                Generate AI reply
              </Button>
              <Textarea value={draftReply} onChange={(event) => setDraftReply(event.target.value)} placeholder="Reply draft" />
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  addMessage({
                    organizationId: workspace.organization.id,
                    customerId: customer?.id,
                    petId: pet?.id,
                    channel: message.channel,
                    direction: "outbound",
                    subject: `Reply: ${message.subject}`,
                    body: draftReply || "Thanks for reaching out.",
                    sender: "Front Desk",
                    aiSuggested: true,
                  })
                }
              >
                Send mock reply
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Related records</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {customer ? <Link href={`/customers/${customer.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Customer · {customer.name}</Link> : null}
              {pet ? <Link href={`/pets/${pet.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Pet · {pet.name}</Link> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
