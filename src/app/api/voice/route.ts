// Twilio Programmable Voice webhook for the PawFlow AI receptionist.
//
// Architecture: turn-based speech conversation using <Gather input="speech">.
// Twilio transcribes the caller, POSTs the text here, we run the pure
// conversation engine, and reply with <Say> + the next <Gather>. Conversation
// state is serialized into the action URL, so this route is fully stateless
// and Vercel-serverless-safe (no WebSockets, no sticky sessions).
//
// Setup (real mode): point your Twilio number's Voice webhook at
//   POST https://<your-domain>/api/voice
// Demo mode: with no Twilio env vars this route still works — it's also what
// the in-app call simulator exercises for parity testing.
//
// NOTE: Server routes cannot see the browser's localStorage workspace, so
// demo-mode phone calls run against the seeded demo workspace. Once the
// Supabase DataStore lands (see MASTER-PROMPT-PawFlow-Fix.md, F5), swap
// `loadContext` to read the organization's real data.

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createDemoWorkspace } from "@/lib/demo-data";
import {
  handleTurn,
  startCall,
  type CallState,
  type EngineAction,
  type ReceptionistContext,
} from "@/lib/receptionist/engine";
import { sendMessage } from "@/lib/twilio";

export const runtime = "nodejs";

function loadContext(): ReceptionistContext {
  const workspace = createDemoWorkspace();
  return {
    organization: workspace.organization,
    services: workspace.services,
    staff: workspace.staff,
    customers: workspace.customers,
    pets: workspace.pets,
    appointments: workspace.appointments,
    now: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Twilio request signature validation (skipped in demo mode / simulator calls)
// ---------------------------------------------------------------------------

function isValidTwilioSignature(request: Request, params: Record<string, string>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // demo mode — no Twilio configured

  const signature = request.headers.get("x-twilio-signature");
  const isSimulator = request.headers.get("x-pawflow-simulator") === "true";
  if (isSimulator) return true;
  if (!signature) return false;

  const url = new URL(request.url);
  const fullUrl = `${url.origin}${url.pathname}${url.search}`;
  const data = fullUrl + Object.keys(params).sort().map((key) => key + params[key]).join("");
  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// State round-tripping through the action URL
// ---------------------------------------------------------------------------

function encodeState(state: CallState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function decodeState(encoded: string | null): CallState | null {
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CallState;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// TwiML rendering
// ---------------------------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(body: string): NextResponse {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function gatherReply(reply: string, state: CallState, origin: string): NextResponse {
  const action = `${origin}/api/voice?state=${encodeState(state)}`;
  return twiml(
    `<Gather input="speech" speechTimeout="auto" speechModel="phone_call" action="${escapeXml(action)}" method="POST">` +
      `<Say voice="Google.en-US-Neural2-F">${escapeXml(reply)}</Say>` +
      `</Gather>` +
      `<Say voice="Google.en-US-Neural2-F">Sorry, I didn't hear anything. We'll text you a booking link. Goodbye!</Say>`,
  );
}

function finalReply(reply: string): NextResponse {
  return twiml(`<Say voice="Google.en-US-Neural2-F">${escapeXml(reply)}</Say><Hangup/>`);
}

// ---------------------------------------------------------------------------
// Action side effects (SMS follow-ups; booking persistence lands with F5)
// ---------------------------------------------------------------------------

async function runActions(actions: EngineAction[]) {
  for (const action of actions) {
    if (action.type === "send_sms_followup") {
      await sendMessage({
        organizationId: "org-demo",
        channel: "sms",
        direction: "outbound",
        subject: "AI receptionist follow-up",
        body: action.body,
        sender: "PawFlow AI",
      });
    }
    // create_booking_request / escalate_to_staff are persisted by the
    // simulator in demo mode; server-side persistence arrives with the
    // Supabase DataStore (fix prompt F5).
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";

  const params: Record<string, string> = {};
  if (contentType.includes("application/json")) {
    // Call-simulator parity path
    const body = (await request.json()) as { callerPhone?: string; utterance?: string; state?: CallState | null };
    const context = loadContext();
    const result = body.state
      ? handleTurn(context, body.state, body.utterance ?? "")
      : startCall(context, body.callerPhone ?? "unknown");
    await runActions(result.actions);
    return NextResponse.json(result);
  }

  // Twilio form-encoded path
  const form = await request.formData();
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  if (!isValidTwilioSignature(request, params)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const context = loadContext();
  const existing = decodeState(url.searchParams.get("state"));
  const speech = params.SpeechResult ?? "";
  const caller = params.From ?? "unknown";

  const result = existing ? handleTurn(context, existing, speech) : startCall(context, caller);
  await runActions(result.actions);

  if (result.endCall) {
    return finalReply(result.reply);
  }
  return gatherReply(result.reply, result.state, url.origin);
}
