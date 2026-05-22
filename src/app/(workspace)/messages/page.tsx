"use client";

import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { MessageThread } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const templates = [
  "Ready to Wag: {pet} is looking fresh and ready for pickup.",
  "Missed Call Rescue: Sorry we missed you. Send your pet's name and what you need help with.",
  "Vaccine Watch: Please upload updated records before boarding or daycare.",
];

export default function MessagesPage() {
  const { workspace, addMessage, addAiLog, runAiTask } = usePawFlow();
  const [replyDraft, setReplyDraft] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);

  const latestInbound = workspace.messages.find((message) => message.direction === "inbound");

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-4">
        {workspace.messages.map((message) => (
          <MessageThread key={message.id} message={message} />
        ))}
      </div>
      <div className="space-y-4">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">AI suggested reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600">Generate a reply from the latest customer message, then send it as a mock SMS or email.</p>
            <Button
              className="rounded-full"
              onClick={async () => {
                if (!latestInbound) return;
                const output = await runAiTask("generateCustomerReply", {
                  customerName: latestInbound.sender,
                  question: latestInbound.body,
                });
                addAiLog("generateCustomerReply", latestInbound.body, output);
                setReplyDraft(output);
              }}
            >
              Generate reply
            </Button>
            <Textarea value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder="AI suggested reply appears here..." />
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                addMessage({
                  organizationId: workspace.organization.id,
                  customerId: latestInbound?.customerId,
                  petId: latestInbound?.petId,
                  channel: latestInbound?.channel || "sms",
                  direction: "outbound",
                  subject: "Reply from PawFlow",
                  body: replyDraft,
                  sender: "Front Desk",
                  aiSuggested: true,
                })
              }
            >
              Mock-send reply
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Message templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              {templates.map((template) => (
                <option key={template} value={template}>{template}</option>
              ))}
            </select>
            <Textarea value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} />
            <Input placeholder="Subject" defaultValue="Customer update" />
            <Button
              className="rounded-full"
              onClick={() =>
                addMessage({
                  organizationId: workspace.organization.id,
                  channel: "sms",
                  direction: "outbound",
                  subject: "Template send",
                  body: selectedTemplate,
                  sender: "PawFlow Templates",
                })
              }
            >
              Mock-send template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
