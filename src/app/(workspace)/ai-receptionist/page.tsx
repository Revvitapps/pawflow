"use client";

import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { EmptyState } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const faqs = [
  "How much is a doodle groom?",
  "Do you have boarding availability next weekend?",
  "What vaccines do you require for daycare?",
];

export default function AIReceptionistPage() {
  const { workspace, simulateMissedCall, addAiLog, runAiTask, createBoardingRequest, createIntakeRequest } = usePawFlow();
  const [active, setActive] = useState(true);
  const [testQuestion, setTestQuestion] = useState("");
  const [testResponse, setTestResponse] = useState("");

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-500">Warm, helpful front-desk assistant for a boutique grooming and boarding business.</p>
            <h2 className="font-heading text-3xl font-semibold text-zinc-900">AI Receptionist Command Center</h2>
          </div>
          <Button variant={active ? "default" : "outline"} className="rounded-full" onClick={() => setActive((value) => !value)}>
            {active ? "Active" : "Inactive"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Missed Call / Lead Capture</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const input = {
                  customerName: String(formData.get("customerName")),
                  phone: String(formData.get("phone")),
                  message: String(formData.get("message")),
                };
                const [textBack, classificationRaw] = await Promise.all([
                  runAiTask("generateMissedCallTextBack", input),
                  runAiTask("classifyInboundMessage", { message: input.message }),
                ]);

                let intent = "other";
                try {
                  intent = JSON.parse(classificationRaw).intent;
                } catch {
                  intent = classificationRaw.includes("boarding") ? "boarding" : "grooming";
                }
                simulateMissedCall(input, textBack, intent);
                addAiLog("generateMissedCallTextBack", input.message, textBack);

                const intakePayload = {
                  customerName: input.customerName,
                  phone: input.phone,
                  email: `${input.customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
                  petName: "New Pup",
                  breed: "Unknown",
                  serviceNeeded: intent === "boarding" ? "Overnight Boarding" : "Full Groom",
                  preferredDates: "Next available",
                  specialNotes: input.message,
                  behaviorConcerns: "",
                  vaccineStatus: "Needs follow-up",
                  requestType: intent === "boarding" ? "boarding" : "grooming",
                } as const;

                if (intent === "boarding") {
                  createBoardingRequest(intakePayload, `Lead created from missed call: ${input.message}`);
                } else {
                  createIntakeRequest(intakePayload, `Lead created from missed call: ${input.message}`);
                }
                event.currentTarget.reset();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="customerName" placeholder="Customer name" required />
                <Input name="phone" placeholder="Phone number" required />
              </div>
              <Textarea name="message" placeholder="What did the caller need help with?" required />
              <Button className="rounded-full">Simulate missed call</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Receptionist test prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {faqs.map((faq) => (
                <button key={faq} className="rounded-full bg-zinc-100 px-3 py-2 text-sm text-zinc-700" onClick={() => setTestQuestion(faq)}>
                  {faq}
                </button>
              ))}
            </div>
            <Textarea value={testQuestion} onChange={(e) => setTestQuestion(e.target.value)} placeholder="Ask the AI receptionist a customer-style question..." />
            <Button
              className="rounded-full"
              onClick={async () => {
                const output = await runAiTask("answerReceptionistQuestion", { question: testQuestion });
                addAiLog("answerReceptionistQuestion", testQuestion, output);
                setTestResponse(output);
              }}
            >
              Ask receptionist
            </Button>
            <div className="rounded-[24px] bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">{testResponse || "Response will appear here."}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">AI conversation log</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {workspace.missedCalls.length ? (
            workspace.missedCalls.map((call) => (
              <div key={call.id} className="rounded-[28px] bg-zinc-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">{call.customerName} · {call.phone}</p>
                    <p className="mt-1 text-sm text-zinc-600">{call.summary}</p>
                  </div>
                  <div className="rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white">{call.intent}</div>
                </div>
                <p className="mt-3 rounded-[20px] bg-white px-4 py-3 text-sm leading-6 text-zinc-700">{call.textBack}</p>
              </div>
            ))
          ) : (
            <EmptyState title="No conversation logs yet" body="Simulated calls and AI receptionist chats will appear here." icon={() => null} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
