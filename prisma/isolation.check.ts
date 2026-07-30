/**
 * Cross-tenant isolation check — the Phase 2 gate.
 * Proves the guarded data layer (src/server/db.ts) never leaks or mutates one
 * business's data on behalf of another. Run: npm run isolation  (seed first).
 */
import { PrismaClient } from "@prisma/client";
import { db } from "../src/server/db";

const prisma = new PrismaClient();

let failures = 0;
function check(name: string, pass: boolean) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) failures++;
}

async function main() {
  const zion = await prisma.business.findFirst({ where: { slug: "zion-and-co-grooming-lodge" } });
  const barkley = await prisma.business.findFirst({ where: { slug: "barkley-boarding-co" } });
  if (!zion || !barkley) throw new Error("Run the seed first (both businesses required)");

  // 1 + 2. Reads are tenant-scoped.
  const zClients = await db.listClients(zion.id);
  const bClients = await db.listClients(barkley.id);
  check("Zion sees only its own clients", zClients.every((c) => c.businessId === zion.id));
  check("Barkley sees only its own clients", bClients.every((c) => c.businessId === barkley.id));

  // 3. No shared client ids across tenants.
  check(
    "Businesses share no client ids",
    !zClients.some((z) => bClients.find((b) => b.id === z.id))
  );

  // 4. Cross-tenant fetch-by-id returns null, not another tenant's row.
  const stolenClient = await db.getClient(barkley.id, zClients[0].id);
  check("Barkley cannot fetch a Zion client by id", stolenClient === null);

  const zAppts = await db.listAppointments(zion.id);
  const stolenAppt = await db.getAppointment(barkley.id, zAppts[0].id);
  check("Barkley cannot fetch a Zion appointment by id", stolenAppt === null);

  // 5. Cross-tenant status mutation on an appointment must throw.
  let threwAppt = false;
  try {
    await db.setAppointmentStatus(barkley.id, zAppts[0].id, "cancelled");
  } catch {
    threwAppt = true;
  }
  check("Barkley cannot cancel a Zion appointment", threwAppt);
  const apptAfter = await prisma.appointment.findUnique({ where: { id: zAppts[0].id } });
  check("Zion appointment unchanged by cross-tenant attempt", apptAfter?.status !== "cancelled");

  // 6. Cross-tenant invoice mutation must throw.
  const zInvoice = await prisma.invoice.findFirst({ where: { businessId: zion.id, status: "unpaid" } });
  let threwInvoice = false;
  try {
    if (zInvoice) await db.setInvoiceStatus(barkley.id, zInvoice.id, "paid");
  } catch {
    threwInvoice = true;
  }
  check("Barkley cannot mark a Zion invoice paid", threwInvoice);
  if (zInvoice) {
    const invAfter = await prisma.invoice.findUnique({ where: { id: zInvoice.id } });
    check("Zion invoice unchanged by cross-tenant attempt", invAfter?.status === "unpaid");
  }

  // 7. Cross-tenant kennel assignment (capacity op) must throw.
  const zReservation = await prisma.reservation.findFirst({ where: { businessId: zion.id } });
  const bKennel = await prisma.kennel.findFirst({ where: { businessId: barkley.id } });
  let threwKennel = false;
  try {
    if (zReservation && bKennel) await db.assignKennel(barkley.id, zReservation.id, bKennel.id);
  } catch {
    threwKennel = true;
  }
  check("Barkley cannot assign a kennel to a Zion reservation", threwKennel);

  console.log(failures === 0 ? "\nALL ISOLATION CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
