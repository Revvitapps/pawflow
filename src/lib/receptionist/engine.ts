// The PawFlow voice receptionist conversation engine.
//
// Pure and isomorphic: no API calls, no storage, no environment access.
// The same engine powers the in-app call simulator (client-side, demo mode)
// and the Twilio voice webhook (server-side, real calls). State is a plain
// serializable object so the phone adapter can round-trip it through TwiML
// action URLs and stay stateless on Vercel.

import type { Appointment, Customer, Organization, Pet, Service, StaffMember } from "@/lib/types";
import {
  containsEscalationTrigger,
  estimatePrice,
  matchBreed,
  vaccineRequirementsFor,
} from "@/lib/receptionist/domain";

export type CallPhase =
  | "greeting"
  | "intent"
  | "pet_details"
  | "scheduling"
  | "vaccines"
  | "confirm"
  | "done"
  | "escalated";

export type CallIntent = "grooming" | "boarding" | "daycare" | "pricing" | "hours" | "vaccines" | "reschedule" | "human" | "unknown";

export interface CallSlots {
  intent: CallIntent;
  customerName?: string;
  petName?: string;
  breed?: string;
  serviceId?: string;
  preferredDay?: string; // ISO date
  offeredSlots?: SlotOffer[];
  chosenSlot?: SlotOffer;
  vaccineConfirmed?: boolean;
  notes: string[];
}

export interface SlotOffer {
  date: string; // ISO date
  startTime: string; // HH:mm
  staffId: string;
  label: string; // human-friendly, e.g. "Thursday at 9:00 AM with Amelia"
}

export interface CallState {
  phase: CallPhase;
  turns: number;
  callerPhone: string;
  matchedCustomerId?: string;
  slots: CallSlots;
}

export interface ReceptionistContext {
  organization: Organization;
  services: Service[];
  staff: StaffMember[];
  customers: Customer[];
  pets: Pet[];
  appointments: Appointment[];
  now: Date; // injected clock — keeps the engine testable
}

export type EngineAction =
  | { type: "create_booking_request"; category: "grooming" | "boarding" | "daycare"; payload: BookingRequestPayload }
  | { type: "escalate_to_staff"; reason: string; transcript: string }
  | { type: "send_sms_followup"; toPhone: string; body: string };

export interface BookingRequestPayload {
  customerName: string;
  phone: string;
  petName: string;
  breed: string;
  serviceNeeded: string;
  preferredDates: string;
  specialNotes: string;
  vaccineStatus: string;
}

export interface EngineResult {
  state: CallState;
  reply: string;
  actions: EngineAction[];
  endCall: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startCall(context: ReceptionistContext, callerPhone: string): EngineResult {
  const customer = findCustomerByPhone(context, callerPhone);
  const state: CallState = {
    phase: "intent",
    turns: 0,
    callerPhone,
    matchedCustomerId: customer?.id,
    slots: { intent: "unknown", customerName: customer?.name, notes: [] },
  };

  const org = context.organization.name;
  const reply = customer
    ? `Hi ${firstName(customer.name)}, thanks for calling ${org}! This is the automated front desk. Are you calling to book a groom, boarding, or daycare${petHint(context, customer)}?`
    : `Thanks for calling ${org}! Our team is with the pups right now, but I can book you in myself. Are you calling about grooming, boarding, or daycare?`;

  return { state, reply, actions: [], endCall: false };
}

export function handleTurn(context: ReceptionistContext, state: CallState, utterance: string): EngineResult {
  const next: CallState = { ...state, turns: state.turns + 1, slots: { ...state.slots, notes: [...state.slots.notes] } };
  const text = utterance.trim();

  if (containsEscalationTrigger(text)) {
    return escalate(context, next, text);
  }
  if (next.turns > 14) {
    return escalate(context, next, "Conversation ran long without resolution.");
  }

  // Opportunistic slot capture on every turn — callers volunteer info out of order.
  captureSlots(context, next, text);

  switch (next.phase) {
    case "intent":
      return intentTurn(context, next, text);
    case "pet_details":
      return petDetailsTurn(context, next, text);
    case "scheduling":
      return schedulingTurn(context, next, text);
    case "vaccines":
      return vaccinesTurn(context, next, text);
    case "confirm":
      return confirmTurn(context, next, text);
    default:
      return { state: next, reply: "Thanks for calling — have a great day!", actions: [], endCall: true };
  }
}

// ---------------------------------------------------------------------------
// Phase handlers
// ---------------------------------------------------------------------------

function intentTurn(context: ReceptionistContext, state: CallState, text: string): EngineResult {
  const intent = detectIntent(text);
  state.slots.intent = intent;

  switch (intent) {
    case "hours": {
      const hours = context.organization.hours.length
        ? context.organization.hours.join(". ")
        : "We're open weekdays 8 to 6 and Saturdays 9 to 4";
      return stay(state, `${hours}. Is there anything else I can help with — maybe booking an appointment?`);
    }
    case "vaccines": {
      const required = vaccineRequirementsFor("boarding", context.organization.vaccineRequirements);
      return stay(
        state,
        `For boarding and daycare we require ${listWords(required)}, all current. For grooming we just need a current rabies vaccine. You can send records by text or upload them in our pet parent portal. Would you like to book something?`,
      );
    }
    case "pricing": {
      const breed = state.slots.breed ? matchBreed(state.slots.breed) : matchBreed(text);
      const groom = findService(context, "grooming");
      if (breed && groom) {
        const est = estimatePrice(groom.price, groom.durationMinutes, breed.profile);
        state.phase = "pet_details";
        return stay(
          state,
          `For a ${breed.breed}, a ${groom.name.toLowerCase()} usually runs $${est.low} to $${est.high} and takes about ${formatDuration(est.minutes)}${est.coatNote ? ` — ${est.coatNote}` : ""}. Final pricing is confirmed at check-in based on coat condition. Want me to get that booked? If so, what's your pup's name?`,
        );
      }
      return stay(
        state,
        `Happy to help with pricing! It depends on your dog's size and coat — what breed is your pup? For reference, our ${groom ? groom.name.toLowerCase() : "full groom"} starts at $${groom ? groom.price : 95} for a medium, smooth-coated dog.`,
      );
    }
    case "reschedule":
      return escalate(context, state, `Caller wants to change an existing appointment: "${text}"`);
    case "human":
      return escalate(context, state, "Caller asked for a person.");
    case "grooming":
    case "boarding":
    case "daycare": {
      state.phase = "pet_details";
      const known = knownPetsFor(context, state);
      if (known.length === 1) {
        const pet = known[0];
        state.slots.petName = pet.name;
        state.slots.breed = pet.breed;
        if (intent === "grooming" && pet.cutPreferences) {
          state.phase = "scheduling";
          return offerSlots(context, state, `Booking a groom for ${pet.name} — got it. Should we do the same as last time (${pet.cutPreferences})?`);
        }
        state.phase = "scheduling";
        return offerSlots(context, state, `Booking for ${pet.name} the ${pet.breed} — wonderful.`);
      }
      if (state.slots.petName && state.slots.breed) {
        state.phase = "scheduling";
        return offerSlots(context, state, "");
      }
      return stay(state, `Wonderful — I can set up ${intent} for you. What's your pup's name and breed?`);
    }
    default:
      return stay(
        state,
        `I can help you book grooming, boarding, or daycare, or answer questions about pricing, hours, and vaccine requirements. Which would you like?`,
      );
  }
}

function petDetailsTurn(context: ReceptionistContext, state: CallState, text: string): EngineResult {
  if (!state.slots.petName) {
    // Assume the shortest capitalizable token is a name if breed matched; otherwise ask again.
    const guessed = guessPetName(text);
    if (guessed) state.slots.petName = guessed;
  }
  if (state.slots.petName && state.slots.breed) {
    state.phase = "scheduling";
    const breed = matchBreed(state.slots.breed);
    const groom = findService(context, serviceCategory(state.slots.intent));
    let priceLine = "";
    if (breed && groom && state.slots.intent === "grooming") {
      const est = estimatePrice(groom.price, groom.durationMinutes, breed.profile);
      priceLine = ` A ${groom.name.toLowerCase()} for a ${breed.breed} usually runs $${est.low} to $${est.high}.`;
    }
    return offerSlots(context, state, `${state.slots.petName} the ${state.slots.breed} — love it.${priceLine}`);
  }
  if (state.slots.petName && !state.slots.breed) {
    return stay(state, `Great, and what breed is ${state.slots.petName}? That helps me estimate timing and pricing.`);
  }
  return stay(state, `Sorry, I didn't catch that. What's your pup's name?`);
}

function schedulingTurn(context: ReceptionistContext, state: CallState, text: string): EngineResult {
  const offers = state.slots.offeredSlots ?? [];
  const chosen = pickOfferedSlot(text, offers);
  if (chosen) {
    state.slots.chosenSlot = chosen;
    state.phase = "vaccines";
    const required = vaccineRequirementsFor(serviceCategory(state.slots.intent), context.organization.vaccineRequirements);
    return stay(
      state,
      `Perfect, ${chosen.label} it is. One last thing — ${serviceCategory(state.slots.intent) === "grooming" ? `is ${state.slots.petName}'s rabies vaccine current?` : `we require ${listWords(required)} for ${state.slots.intent}. Are those all current for ${state.slots.petName}?`}`,
    );
  }
  if (/\b(no|none|neither|different|other|another)\b/i.test(text)) {
    return offerSlots(context, state, "No problem — here are a few more options.", offers.length);
  }
  return offerSlots(context, state, "Sorry, I didn't catch which time works.");
}

function vaccinesTurn(context: ReceptionistContext, state: CallState, text: string): EngineResult {
  const yes = /\b(yes|yeah|yep|current|up to date|they are|all set|sure)\b/i.test(text);
  const no = /\b(no|not|expired|overdue|don't|dont|unsure|think so)\b/i.test(text);
  state.slots.vaccineConfirmed = yes && !no;
  if (!state.slots.vaccineConfirmed) {
    state.slots.notes.push("Vaccine records need verification before the visit.");
  }
  state.phase = "confirm";
  const slot = state.slots.chosenSlot;
  const vaccineLine = state.slots.vaccineConfirmed
    ? ""
    : ` We'll text you a link to upload vaccine records — they'll need to be verified before the visit.`;
  return stay(
    state,
    `${state.slots.vaccineConfirmed ? "Wonderful." : "That's okay — we can sort it out."} So that's ${state.slots.intent} for ${state.slots.petName}, ${slot ? slot.label : "next available"}.${vaccineLine} Shall I lock that in?`,
  );
}

function confirmTurn(context: ReceptionistContext, state: CallState, text: string): EngineResult {
  const yes = /\b(yes|yeah|yep|sure|lock|book|confirm|perfect|sounds good|please)\b/i.test(text);
  const no = /\b(no|cancel|nevermind|never mind|actually)\b/i.test(text);

  if (no && !yes) {
    state.phase = "scheduling";
    return offerSlots(context, state, "No problem — want to look at different times?");
  }
  if (!yes) {
    return stay(state, `Sorry — should I go ahead and book it? A quick yes or no works.`);
  }

  state.phase = "done";
  const category = serviceCategory(state.slots.intent);
  const slot = state.slots.chosenSlot;
  const customer = state.matchedCustomerId
    ? findCustomer(context, state.matchedCustomerId)
    : undefined;

  const actions: EngineAction[] = [
    {
      type: "create_booking_request",
      category,
      payload: {
        customerName: state.slots.customerName ?? customer?.name ?? "New caller",
        phone: state.callerPhone,
        petName: state.slots.petName ?? "New pet",
        breed: state.slots.breed ?? "Unknown",
        serviceNeeded: findService(context, category)?.name ?? category,
        preferredDates: slot ? `${slot.date} ${slot.startTime}` : "Next available",
        specialNotes: state.slots.notes.join(" ") || "Booked by AI receptionist over the phone.",
        vaccineStatus: state.slots.vaccineConfirmed ? "Reported current — verify at check-in" : "Needs verification",
      },
    },
    {
      type: "send_sms_followup",
      toPhone: state.callerPhone,
      body: smsConfirmation(context, state),
    },
  ];

  return {
    state,
    reply: `You're all set! ${state.slots.petName} is booked for ${slot ? slot.label : "the next available opening"}. I'm texting you a confirmation${state.slots.vaccineConfirmed ? "" : " with a vaccine upload link"} now. We can't wait to meet ${state.slots.petName}!`,
    actions,
    endCall: true,
  };
}

function escalate(context: ReceptionistContext, state: CallState, reason: string): EngineResult {
  state.phase = "escalated";
  return {
    state,
    reply: `I want to make sure a person handles this for you. I've flagged it for our team at ${context.organization.name} — someone will call you back shortly at this number. Is there anything else I can note for them?`,
    actions: [
      { type: "escalate_to_staff", reason, transcript: state.slots.notes.join(" ") || reason },
      {
        type: "send_sms_followup",
        toPhone: state.callerPhone,
        body: `Hi, this is ${context.organization.name}. We got your call and a team member will ring you back shortly. Reply here anytime and we'll see it.`,
      },
    ],
    endCall: false,
  };
}

// ---------------------------------------------------------------------------
// NLU helpers (deterministic on purpose — same behavior with zero API keys)
// ---------------------------------------------------------------------------

export function detectIntent(text: string): CallIntent {
  const lower = text.toLowerCase();
  if (/\b(reschedule|change (my|our|the) appointment|move (my|our|the)|cancel (my|our|the))\b/.test(lower)) return "reschedule";
  if (/\b(human|person|manager|someone|front desk|real)\b/.test(lower)) return "human";
  if (/\b(board|boarding|overnight|stay|kennel|out of town|vacation|weekend away)\b/.test(lower)) return "boarding";
  if (/\b(daycare|day care|drop off for the day|socializ)\b/.test(lower)) return "daycare";
  if (/\b(price|pricing|cost|how much|rate|charge)\b/.test(lower)) return "pricing";
  if (/\b(hour|open|close|when are you|what time)\b/.test(lower)) return "hours";
  if (/\b(vaccine|vaccin|shot record|rabies|bordetella)\b/.test(lower)) return "vaccines";
  if (/\b(groom|grooming|haircut|hair cut|trim|bath|nail|deshed|de-shed)\b/.test(lower)) return "grooming";
  if (/\b(book|appointment|schedule|come in|availability|available|opening)\b/.test(lower)) return "grooming";
  return "unknown";
}

function captureSlots(context: ReceptionistContext, state: CallState, text: string) {
  if (!state.slots.breed) {
    const breed = matchBreed(text);
    if (breed) state.slots.breed = breed.breed;
  }
  if (!state.slots.petName) {
    const named = /(?:my dog|my pup|my puppy|my cat|his name is|her name is|name's|named|for)\s+([A-Z][a-z]{2,12})\b/.exec(text);
    if (named) state.slots.petName = named[1];
    // Callers volunteer names alongside the breed: "my husky Luna needs boarding".
    if (!state.slots.petName && state.slots.breed) {
      state.slots.petName = guessPetName(text);
    }
  }
  if (!state.slots.customerName) {
    const named = /(?:this is|my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/.exec(text);
    if (named) state.slots.customerName = named[1];
  }
}

function guessPetName(text: string): string | undefined {
  const capitalized = text.match(/\b[A-Z][a-z]{2,12}\b/g) ?? [];
  const stopwords = new Set(["The", "Yes", "She", "His", "Her", "They", "And", "But", "For", "Its", "Our", "What", "That", "This", "Can", "How"]);
  const candidate = capitalized.find((word) => !stopwords.has(word) && !matchBreed(word));
  return candidate;
}

function pickOfferedSlot(text: string, offers: SlotOffer[]): SlotOffer | undefined {
  const lower = text.toLowerCase();
  const ordinals = [
    /(first|option (one|1)\b|number (one|1)\b|1st)/,
    /(second|option (two|2)\b|number (two|2)\b|2nd)/,
    /(third|option (three|3)\b|number (three|3)\b|3rd)/,
  ];
  for (let i = 0; i < offers.length; i++) {
    if (ordinals[i] && ordinals[i].test(lower)) return offers[i];
  }
  for (const offer of offers) {
    const day = dayName(offer.date).toLowerCase();
    const hour = offer.startTime.replace(/^0/, "").split(":")[0];
    if (lower.includes(day) || lower.includes(`${hour} `) || lower.includes(`${hour}:`) || lower.includes(`at ${hour}`)) {
      return offer;
    }
  }
  if (/\b(yes|sure|that works|sounds good|perfect|okay|ok)\b/.test(lower) && offers.length > 0) {
    return offers[0];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Availability — simple, deterministic slot generation from real workspace data
// ---------------------------------------------------------------------------

export function generateSlots(context: ReceptionistContext, count: number, skip = 0): SlotOffer[] {
  const category = "grooming";
  const service = findService(context, category);
  const durationMinutes = service?.durationMinutes ?? 90;
  const candidateTimes = ["09:00", "11:30", "14:00"];
  const offers: SlotOffer[] = [];
  const start = new Date(context.now);

  for (let dayOffset = 1; dayOffset <= 14 && offers.length < count + skip; dayOffset++) {
    const day = new Date(start);
    day.setDate(day.getDate() + dayOffset);
    if (day.getDay() === 0) continue; // closed Sundays
    const iso = day.toISOString().slice(0, 10);

    for (const time of candidateTimes) {
      if (offers.length >= count + skip) break;
      const staffMember = context.staff.find(
        (person) => !context.appointments.some(
          (appt) => appt.staffId === person.id && appt.date === iso && overlaps(appt.startTime, appt.endTime, time, addMinutes(time, durationMinutes)),
        ),
      );
      if (staffMember) {
        offers.push({
          date: iso,
          startTime: time,
          staffId: staffMember.id,
          label: `${dayName(iso)} at ${friendlyTime(time)} with ${firstName(staffMember.name)}`,
        });
      }
    }
  }
  return offers.slice(skip, skip + count);
}

function offerSlots(context: ReceptionistContext, state: CallState, prefix: string, skip = 0): EngineResult {
  const offers = generateSlots(context, 3, skip);
  state.slots.offeredSlots = offers;
  state.phase = "scheduling";
  if (offers.length === 0) {
    return escalate(context, state, "No availability found in the next two weeks — needs human scheduling.");
  }
  const listed = offers.map((offer, i) => `option ${i + 1}: ${offer.label}`).join(", ");
  return stay(state, `${prefix ? prefix + " " : ""}I have ${listed}. Which works best?`);
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function stay(state: CallState, reply: string): EngineResult {
  return { state, reply, actions: [], endCall: false };
}

function findCustomerByPhone(context: ReceptionistContext, phone: string): Customer | undefined {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 7) return undefined;
  return context.customers.find((customer) => customer.phone.replace(/\D/g, "").slice(-10) === digits);
}

function findCustomer(context: ReceptionistContext, id: string): Customer | undefined {
  return context.customers.find((customer) => customer.id === id);
}

function knownPetsFor(context: ReceptionistContext, state: CallState): Pet[] {
  if (!state.matchedCustomerId) return [];
  return context.pets.filter((pet) => pet.customerId === state.matchedCustomerId);
}

function petHint(context: ReceptionistContext, customer: Customer): string {
  const pets = context.pets.filter((pet) => pet.customerId === customer.id);
  return pets.length === 1 ? ` for ${pets[0].name}` : "";
}

function findService(context: ReceptionistContext, category: "grooming" | "boarding" | "daycare"): Service | undefined {
  return context.services.find((service) => service.category === category);
}

function serviceCategory(intent: CallIntent): "grooming" | "boarding" | "daycare" {
  return intent === "boarding" ? "boarding" : intent === "daycare" ? "daycare" : "grooming";
}

function smsConfirmation(context: ReceptionistContext, state: CallState): string {
  const slot = state.slots.chosenSlot;
  const vaccineLine = state.slots.vaccineConfirmed
    ? ""
    : ` Please upload ${state.slots.petName}'s vaccine records before the visit — we'll send a portal link.`;
  return `${context.organization.name}: ${state.slots.petName} is booked for ${slot ? `${dayName(slot.date)} at ${friendlyTime(slot.startTime)}` : "our next opening"}.${vaccineLine} Reply here with any questions!`;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} minutes`;
  if (rest === 0) return hours === 1 ? "an hour" : `${hours} hours`;
  return `${hours} hour${hours > 1 ? "s" : ""} and ${rest} minutes`;
}

function listWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function dayName(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function friendlyTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
