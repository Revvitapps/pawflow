// Self-test for the AI receptionist engine. Run: npx tsx scripts/receptionist-selftest.ts
import { createDemoWorkspace } from "../src/lib/demo-data";
import { detectIntent, generateSlots, handleTurn, startCall, type ReceptionistContext } from "../src/lib/receptionist/engine";
import { estimatePrice, matchBreed } from "../src/lib/receptionist/domain";

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ws = createDemoWorkspace();
const context: ReceptionistContext = {
  organization: ws.organization,
  services: ws.services,
  staff: ws.staff,
  customers: ws.customers,
  pets: ws.pets,
  appointments: ws.appointments,
  now: new Date(),
};

console.log("\n[1] Domain knowledge");
check("matches 'golden doodle' alias", matchBreed("I have a golden doodle named Milo")?.breed === "goldendoodle");
check("matches transcription-mangled 'sheet zoo'", matchBreed("she's a sheet zoo")?.breed === "shih tzu");
check("prefers longest match (mini goldendoodle)", matchBreed("a mini goldendoodle please")?.breed === "mini goldendoodle");
const doodle = matchBreed("goldendoodle");
if (doodle) {
  const est = estimatePrice(115, 150, doodle.profile);
  check("doodle estimate is a range with surcharge", est.low > 115 && est.high > est.low, JSON.stringify(est));
}

console.log("\n[2] Intent detection");
check("boarding via 'out of town'", detectIntent("we're going out of town next week") === "boarding");
check("pricing via 'how much'", detectIntent("how much is a bath and trim") === "pricing");
check("human via 'real person'", detectIntent("can I talk to a real person") === "human");
check("grooming via 'nail trim'", detectIntent("just a nail trim please") === "grooming");

console.log("\n[3] Returning-customer recognition");
const known = ws.customers[0];
const startKnown = startCall(context, known.phone);
check("greets returning customer by first name", startKnown.reply.includes(known.name.split(" ")[0]), startKnown.reply);
const startUnknown = startCall(context, "(555) 000-1234");
check("new caller gets generic greeting", !startUnknown.reply.includes("Hi "), startUnknown.reply);

console.log("\n[4] Full happy-path booking (new caller)");
let r = startCall(context, "(555) 867-5309");
r = handleTurn(context, r.state, "Hi, I'd like to book a groom");
check("asks for pet details", r.reply.toLowerCase().includes("name"), r.reply);
r = handleTurn(context, r.state, "His name is Waffles and he's a goldendoodle");
check("captured pet name", r.state.slots.petName === "Waffles", JSON.stringify(r.state.slots));
check("captured breed", r.state.slots.breed === "goldendoodle");
check("offers slots", (r.state.slots.offeredSlots ?? []).length === 3, r.reply);
r = handleTurn(context, r.state, "The second one works");
check("slot chosen", r.state.slots.chosenSlot !== undefined);
check("asks about vaccines", r.reply.toLowerCase().includes("rabies") || r.reply.toLowerCase().includes("vaccine"), r.reply);
r = handleTurn(context, r.state, "Yes, all current");
check("moves to confirm", r.state.phase === "confirm", r.state.phase);
r = handleTurn(context, r.state, "Yes, book it!");
check("call ends", r.endCall === true);
check("emits booking action", r.actions.some((a) => a.type === "create_booking_request"));
check("emits SMS confirmation", r.actions.some((a) => a.type === "send_sms_followup"));
const booking = r.actions.find((a) => a.type === "create_booking_request");
check("booking has pet + slot", booking?.type === "create_booking_request" && booking.payload.petName === "Waffles" && booking.payload.preferredDates !== "Next available");

console.log("\n[5] Escalation safety");
let e = startCall(context, "(555) 111-2222");
e = handleTurn(context, e.state, "My dog is bleeding, this is an emergency");
check("escalates on emergency", e.state.phase === "escalated", e.state.phase);
check("notifies staff", e.actions.some((a) => a.type === "escalate_to_staff"));
check("texts the caller back", e.actions.some((a) => a.type === "send_sms_followup"));

console.log("\n[6] Vaccine gating for boarding");
let b = startCall(context, "(555) 333-4444");
b = handleTurn(context, b.state, "I need boarding for my husky Luna next weekend");
b = handleTurn(context, b.state, "option 1");
check("boarding asks full vaccine list", /bordetella/i.test(b.reply), b.reply);
b = handleTurn(context, b.state, "I'm not sure actually");
check("unverified vaccines noted", b.state.slots.vaccineConfirmed === false);
b = handleTurn(context, b.state, "yes go ahead");
const bBooking = b.actions.find((a) => a.type === "create_booking_request");
check("booking flags vaccine verification", bBooking?.type === "create_booking_request" && bBooking.payload.vaccineStatus.includes("verification"), JSON.stringify(bBooking));

console.log("\n[7] Slot generation");
const slots = generateSlots(context, 3);
check("generates 3 slots", slots.length === 3);
check("no Sunday slots", slots.every((s) => new Date(`${s.date}T12:00:00`).getDay() !== 0));
check("slots have staff + label", slots.every((s) => s.staffId && s.label.includes("with")));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
