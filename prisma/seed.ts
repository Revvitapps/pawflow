/**
 * Seed two coherent pet-care tenants so the multi-tenancy + isolation check has
 * real data on both sides. Run: npm run db:seed  (after db:migrate).
 * Demo login: owner@zionlodge.test / owner@barkley.test — password "pawflow123".
 */
import { PrismaClient, ServiceCategory, KennelKind } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function seedBusiness(opts: {
  name: string;
  slug: string;
  ownerEmail: string;
  brand: Record<string, unknown>;
  boardingCapacity: number;
  staffNames: [string, string];
  clients: { name: string; phone: string; email: string; pet: { name: string; breed: string } }[];
}) {
  const passwordHash = await bcrypt.hash("pawflow123", 10);

  const business = await prisma.business.create({
    data: {
      name: opts.name,
      slug: opts.slug,
      brand: opts.brand as object,
      boardingCapacity: opts.boardingCapacity,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: opts.ownerEmail,
      name: `${opts.name} Owner`,
      passwordHash,
      role: "owner",
      businessId: business.id,
    },
  });
  await prisma.membership.create({
    data: { userId: owner.id, businessId: business.id, role: "owner" },
  });

  const [staffA, staffB] = await Promise.all(
    opts.staffNames.map((name, i) =>
      prisma.staff.create({
        data: {
          businessId: business.id,
          name,
          roleLabel: i === 0 ? "Lead Groomer" : "Boarding Attendant",
          specialty: i === 0 ? "Breed-specific cuts" : "Anxious pets",
          color: i === 0 ? "#79c6bf" : "#f2b7c6",
        },
      })
    )
  );

  const groom = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Full Groom",
      category: ServiceCategory.grooming,
      durationMinutes: 90,
      priceCents: 9500,
      depositRequired: true,
      depositCents: 2500,
      description: "Bath, haircut, nails, ears.",
    },
  });
  const boardNight = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Boarding (per night)",
      category: ServiceCategory.boarding,
      durationMinutes: 1440,
      priceCents: 6500,
      description: "Overnight boarding with playtime.",
    },
  });

  const kennels = await Promise.all(
    ["Run 1", "Run 2", "Suite A"].map((name, i) =>
      prisma.kennel.create({
        data: {
          businessId: business.id,
          name,
          kind: i === 2 ? KennelKind.suite : KennelKind.run,
          capacity: 1,
        },
      })
    )
  );

  for (const [idx, c] of opts.clients.entries()) {
    const client = await prisma.client.create({
      data: {
        businessId: business.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        tags: idx === 0 ? ["VIP"] : ["new lead"],
        notes: ["Seeded client."],
      },
    });
    const pet = await prisma.pet.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        name: c.pet.name,
        breed: c.pet.breed,
        age: "3 yrs",
        weight: "22 lb",
        allergies: idx === 0 ? ["chicken"] : [],
      },
    });
    await prisma.vaccineRecord.create({
      data: {
        businessId: business.id,
        petId: pet.id,
        name: "Rabies",
        expiresAt: daysFromNow(200),
        status: "current",
        uploadedBy: "Front desk",
      },
    });

    // One grooming appointment
    const appt = await prisma.appointment.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        petId: pet.id,
        staffId: staffA.id,
        serviceId: groom.id,
        date: daysFromNow(idx + 1),
        startTime: "09:30",
        endTime: "11:00",
        priceCents: groom.priceCents,
        depositCents: groom.depositCents,
        status: idx === 0 ? "confirmed" : "requested",
        notes: "Same as last time.",
      },
    });

    // One boarding reservation, first client gets a kennel assigned
    const reservation = await prisma.reservation.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        petId: pet.id,
        kennelId: idx === 0 ? kennels[0].id : null,
        kind: "boarding",
        startDate: daysFromNow(5),
        endDate: daysFromNow(8),
        status: idx === 0 ? "confirmed" : "requested",
        feedingNotes: "2 cups AM/PM.",
        vaccineOk: true,
      },
    });

    await prisma.invoice.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        appointmentId: appt.id,
        label: "Full Groom",
        amountCents: groom.priceCents,
        depositCents: groom.depositCents,
        status: idx === 0 ? "paid" : "unpaid",
        method: "card",
        dueDate: daysFromNow(idx + 1),
      },
    });

    await prisma.notification.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        type: "appointment_reminder",
        channel: "sms",
        body: `Reminder: ${c.pet.name}'s ${business.name} appointment is coming up.`,
        status: "queued",
        dueAt: daysFromNow(idx),
      },
    });

    await prisma.auditEvent.create({
      data: {
        businessId: business.id,
        actorId: owner.id,
        action: "seed.client_created",
        entityType: "Client",
        entityId: client.id,
        metadata: { reservationId: reservation.id },
      },
    });
  }

  return business;
}

async function main() {
  // Idempotent: clear prior seed rows (cascades handle children).
  await prisma.business.deleteMany({});

  const zion = await seedBusiness({
    name: "Zion & Co. Grooming Lodge",
    slug: "zion-and-co-grooming-lodge",
    ownerEmail: "owner@zionlodge.test",
    boardingCapacity: 12,
    brand: {
      primaryColor: "#79c6bf",
      secondaryColor: "#fff5ef",
      accentColor: "#f2b7c6",
      portalHeadline: "Book polished grooming and cozy boarding in one place.",
    },
    staffNames: ["Zara Okafor", "Mateo Cruz"],
    clients: [
      { name: "Alicia Bennett", phone: "555-0110", email: "alicia@example.com", pet: { name: "Biscuit", breed: "Goldendoodle" } },
      { name: "Devon Park", phone: "555-0111", email: "devon@example.com", pet: { name: "Mochi", breed: "Shiba Inu" } },
    ],
  });

  const barkley = await seedBusiness({
    name: "Barkley Boarding Co.",
    slug: "barkley-boarding-co",
    ownerEmail: "owner@barkley.test",
    boardingCapacity: 20,
    brand: {
      primaryColor: "#3b82f6",
      secondaryColor: "#eef2ff",
      accentColor: "#f59e0b",
      portalHeadline: "Boarding and daycare your dog actually looks forward to.",
    },
    staffNames: ["Priya Nair", "Sam Delgado"],
    clients: [
      { name: "Marcus Lee", phone: "555-0220", email: "marcus@example.com", pet: { name: "Rex", breed: "German Shepherd" } },
      { name: "Nina Patel", phone: "555-0221", email: "nina@example.com", pet: { name: "Luna", breed: "Border Collie" } },
    ],
  });

  console.log(`Seeded: ${zion.name} (${zion.id})`);
  console.log(`Seeded: ${barkley.name} (${barkley.id})`);
  console.log("Owner logins (password: pawflow123): owner@zionlodge.test, owner@barkley.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
