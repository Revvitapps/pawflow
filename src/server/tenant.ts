/**
 * Tenant provisioning — the ONLY place that creates a Business (tenant) together
 * with its first owner User. This runs BEFORE a session exists, so it is not part
 * of the businessId-scoped guarded data layer (src/server/db.ts); it is the entry
 * point that mints the tenant a session will later be scoped to.
 *
 * A new business is seeded with a small, coherent set of starter services and
 * kennels so the owner lands on a dashboard with real (not empty) structure.
 */
import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ServiceCategory, KennelKind } from "@prisma/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "business";
}

/** Find a slug not already taken, appending a short suffix if needed. */
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.business.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

const STARTER_SERVICES = [
  { name: "Full Groom", category: ServiceCategory.grooming, durationMinutes: 90, priceCents: 9500, depositRequired: true, depositCents: 2500 },
  { name: "Bath & Brush", category: ServiceCategory.grooming, durationMinutes: 45, priceCents: 5500, depositRequired: false, depositCents: 0 },
  { name: "Overnight Boarding", category: ServiceCategory.boarding, durationMinutes: 0, priceCents: 6500, depositRequired: true, depositCents: 3000 },
  { name: "Daycare", category: ServiceCategory.daycare, durationMinutes: 0, priceCents: 4000, depositRequired: false, depositCents: 0 },
];

const STARTER_KENNELS = [
  { name: "Suite 1", kind: KennelKind.suite, capacity: 1 },
  { name: "Suite 2", kind: KennelKind.suite, capacity: 1 },
  { name: "Run A", kind: KennelKind.run, capacity: 1 },
  { name: "Daycare Room", kind: KennelKind.daycare_room, capacity: 12 },
];

export async function createBusinessWithOwner(input: {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
}) {
  const email = input.email.toLowerCase().trim();
  const slug = await uniqueSlug(input.businessName);
  const passwordHash = await bcrypt.hash(input.password, 10);

  // Single transaction: tenant + owner + membership + starter structure, so a
  // partial failure never leaves a half-provisioned tenant.
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: input.businessName.trim(),
        slug,
        brand: { businessName: input.businessName.trim(), primaryColor: "#79c6bf", secondaryColor: "#dff3f0" },
        boardingCapacity: STARTER_KENNELS.reduce((sum, k) => sum + k.capacity, 0),
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: input.ownerName.trim(),
        passwordHash,
        role: "owner",
        businessId: business.id,
      },
    });

    await tx.membership.create({
      data: { userId: user.id, businessId: business.id, role: "owner" },
    });

    await tx.service.createMany({
      data: STARTER_SERVICES.map((s) => ({ ...s, businessId: business.id })),
    });
    await tx.kennel.createMany({
      data: STARTER_KENNELS.map((k) => ({ ...k, businessId: business.id })),
    });

    return { business, user };
  });
}

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export function getBusinessById(businessId: string) {
  return prisma.business.findUnique({ where: { id: businessId } });
}

/**
 * Public lookup for the customer portal (pre-auth, by slug). Returns ONLY the
 * handful of fields safe to render publicly. The internal id is never exposed,
 * and the brand JSON blob is reduced to an explicit allow-list of display fields
 * so an operator who stuffs private data into `brand` can't leak it to the
 * public portal.
 */
export interface PublicBusiness {
  name: string;
  slug: string;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    portalHeadline: string;
  };
}

export async function getPublicBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, slug: true, brand: true },
  });
  if (!business) return null;

  const brand = (business.brand as Record<string, unknown> | null) ?? {};
  const asString = (v: unknown) => (typeof v === "string" ? v : "");

  return {
    name: business.name,
    slug: business.slug,
    brand: {
      primaryColor: asString(brand.primaryColor),
      secondaryColor: asString(brand.secondaryColor),
      portalHeadline: asString(brand.portalHeadline),
    },
  };
}
