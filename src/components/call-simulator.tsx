"use client";

// Phone-call simulator for the AI receptionist. Runs the exact same pure
// conversation engine as the Twilio webhook, but client-side against the
// live demo workspace — so booked calls create real intake requests,
// messages, and escalations you can see across the app. Zero API keys needed.

import { useMemo, useRef, useState } from "react";
import { PhoneCall, PhoneOff } from "lucide-react";

import { usePawFlow } from "@/components/pawflow-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  handleTurn,
  startCall,
  type CallState,
  type EngineAction,
  type ReceptionistContext,
} from "@/lib/receptionist/engine";

interface TranscriptEntry {
  speaker: "caller" | "ai";
  text: string;
}

const SAMPLE_UTTERANCES = [
  "How much is a full groom for a goldendoodle?",
  "I need boarding next weekend for my lab",
  "Do you require vaccines for daycare?",
  "My dog got bit at the park, can someone call me?",
];

export function CallSimulator() {
  const { workspace, createIntakeRequest, createBoardingRequest, addMessage, simulateMissedCall, addAiLog } = usePawFlow();
  const [callState, setCallState] = useState<CallState | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [callerPhone, setCallerPhone] = useState("(555) 201-8834");
  const [ended, setEnded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context: ReceptionistContext = useMemo(
    () => ({
      organization: workspace.organization,
      services: workspace.services,
      staff: workspace.staff,
      customers: workspace.customers,
      pets: workspace.pets,
      appointments: workspace.appointments,
      now: new Date(),
    }),
    [workspace],
  );

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function runActions(actions: EngineAction[], lastUtterance: string) {
    for (const action of actions) {
      if (action.type === "create_booking_request") {
        const payload = {
          customerName: action.payload.customerName,
          phone: action.payload.phone,
          email: "",
          petName: action.payload.petName,
          breed: action.payload.breed,
          serviceNeeded: action.payload.serviceNeeded,
          preferredDates: action.payload.preferredDates,
          specialNotes: action.payload.specialNotes,
          behaviorConcerns: "",
          vaccineStatus: action.payload.vaccineStatus,
          requestType: action.category,
        } as const;
        if (action.category === "boarding") {
          createBoardingRequest(payload, `Booked by AI receptionist voice call: ${action.payload.serviceNeeded} for ${action.payload.petName}.`);
        } else {
          createIntakeRequest(payload, `Booked by AI receptionist voice call: ${action.payload.serviceNeeded} for ${action.payload.petName}.`);
        }
      }
      if (action.type === "escalate_to_staff") {
        simulateMissedCall(
          { customerName: callState?.slots.customerName ?? "Caller", phone: callerPhone, message: action.reason },
          "Team member will call back shortly.",
          "urgent",
        );
      }
      if (action.type === "send_sms_followup") {
        addMessage({
          organizationId: workspace.organization.id,
          channel: "sms",
          direction: "outbound",
          subject: "AI receptionist follow-up",
          body: action.body,
          sender: "PawFlow AI",
          aiSuggested: true,
        });
      }
    }
    addAiLog("answerReceptionistQuestion", lastUtterance, actions.length ? `${actions.length} action(s) executed` : "conversation turn");
  }

  function beginCall() {
    const result = startCall(context, callerPhone);
    setCallState(result.state);
    setTranscript([{ speaker: "ai", text: result.reply }]);
    setEnded(false);
    scrollDown();
  }

  function endCall() {
    setCallState(null);
    setTranscript([]);
    setEnded(false);
    setInput("");
  }

  function speak(text: string) {
    if (!callState || !text.trim() || ended) return;
    const result = handleTurn(context, callState, text.trim());
    setTranscript((prev) => [...prev, { speaker: "caller", text: text.trim() }, { speaker: "ai", text: result.reply }]);
    setCallState(result.state);
    runActions(result.actions, text.trim());
    if (result.endCall) setEnded(true);
    setInput("");
    scrollDown();
  }

  const inCall = callState !== null;
  const knownCaller = workspace.customers.some(
    (customer) => customer.phone.replace(/\D/g, "").slice(-10) === callerPhone.replace(/\D/g, "").slice(-10),
  );

  return (
    <Card className="rounded-[32px] border-white/80 bg-white/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-2xl">Live call simulator</CardTitle>
        {inCall ? (
          <Button variant="outline" className="rounded-full" onClick={endCall}>
            <PhoneOff className="mr-2 h-4 w-4" /> Hang up
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!inCall ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Simulate an inbound phone call. This runs the exact conversation engine behind the Twilio voice line — bookings, escalations, and SMS follow-ups land in your real workspace.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={callerPhone} onChange={(e) => setCallerPhone(e.target.value)} placeholder="Caller phone number" className="sm:max-w-56" />
              <Button className="rounded-full" onClick={beginCall}>
                <PhoneCall className="mr-2 h-4 w-4" /> Start incoming call
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              Tip: use a phone number from your customer list to hear the returning-customer greeting.{" "}
              {knownCaller ? "This number matches an existing customer." : "This number will be treated as a new caller."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto rounded-[24px] bg-zinc-50 p-4">
              {transcript.map((entry, index) => (
                <div key={index} className={`flex ${entry.speaker === "ai" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm leading-6 ${
                      entry.speaker === "ai" ? "bg-white text-zinc-800" : "bg-zinc-900 text-white"
                    }`}
                  >
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide opacity-60">
                      {entry.speaker === "ai" ? "AI receptionist" : "Caller"}
                    </p>
                    {entry.text}
                  </div>
                </div>
              ))}
              {ended ? <p className="pt-1 text-center text-xs font-medium text-zinc-500">— Call ended —</p> : null}
            </div>

            {!ended ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  speak(input);
                }}
              >
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say something as the caller..." autoFocus />
                <Button type="submit" className="rounded-full">
                  Speak
                </Button>
              </form>
            ) : (
              <Button className="rounded-full" onClick={endCall}>
                Start another call
              </Button>
            )}

            <div className="flex flex-wrap gap-2">
              {SAMPLE_UTTERANCES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  disabled={ended}
                  className="rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-700 disabled:opacity-50"
                  onClick={() => speak(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
