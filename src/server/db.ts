/**
 * Guarded data layer. EVERY read and write is scoped by `businessId` — callers
 * pass the current session's businessId and can only ever touch their own
 * tenant's rows. No route or component should import `prisma` directly for
 * domain data; go through here so tenant scoping can never be forgotten.
 *
 * Cross-tenant safety pattern:
 *   - reads:  findMany/findFirst always filter by { businessId }.
 *   - fetch-by-id: findFirst({ where: { id, businessId } }) → null for other tenants.
 *   - writes:  first re-fetch the row scoped by businessId; throw if not found,
 *              so a mutation can never silently touch another tenant's row.
 *
 * The cross-tenant isolation check (prisma/isolation.check.ts) proves this.
 */
import { prisma } from "@/lib/prisma";
import type {
  AppointmentStatus,
  ReservationStatus,
  InvoiceStatus,
  NotificationStatus,
} from "@prisma/client";

export const db = {
  // ----- Clients (pet owners) -----
  listClients(businessId: string) {
    return prisma.client.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      include: { pets: true },
    });
  },

  getClient(businessId: string, id: string) {
    return prisma.client.findFirst({
      where: { id, businessId },
      include: { pets: true, appointments: true, invoices: true },
    });
  },

  createClient(
    businessId: string,
    data: { name: string; phone?: string; email?: string; tags?: string[]; notes?: string[] }
  ) {
    return prisma.client.create({ data: { ...data, businessId } });
  },

  async updateClient(
    businessId: string,
    id: string,
    patch: Partial<{ name: string; phone: string; email: string; tags: string[]; notes: string[]; balanceCents: number }>
  ) {
    const existing = await prisma.client.findFirst({ where: { id, businessId } });
    if (!existing) throw new Error("Client not found");
    return prisma.client.update({ where: { id: existing.id }, data: patch });
  },

  // ----- Pets -----
  listPets(businessId: string) {
    return prisma.pet.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      include: { vaccineRecords: true, client: true },
    });
  },

  getPet(businessId: string, id: string) {
    return prisma.pet.findFirst({
      where: { id, businessId },
      include: { vaccineRecords: true, client: true, appointments: true },
    });
  },

  // ----- Services -----
  listServices(businessId: string) {
    return prisma.service.findMany({ where: { businessId }, orderBy: { name: "asc" } });
  },

  async updateService(
    businessId: string,
    id: string,
    patch: Partial<{ name: string; priceCents: number; durationMinutes: number; depositCents: number; description: string }>
  ) {
    const existing = await prisma.service.findFirst({ where: { id, businessId } });
    if (!existing) throw new Error("Service not found");
    return prisma.service.update({ where: { id: existing.id }, data: patch });
  },

  // ----- Staff -----
  listStaff(businessId: string) {
    return prisma.staff.findMany({ where: { businessId }, orderBy: { name: "asc" } });
  },

  // ----- Kennels / capacity -----
  listKennels(businessId: string) {
    return prisma.kennel.findMany({ where: { businessId }, orderBy: { name: "asc" } });
  },

  // ----- Appointments -----
  listAppointments(businessId: string) {
    return prisma.appointment.findMany({
      where: { businessId },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { client: true, pet: true, staff: true, service: true },
    });
  },

  getAppointment(businessId: string, id: string) {
    return prisma.appointment.findFirst({
      where: { id, businessId },
      include: { client: true, pet: true, staff: true, service: true },
    });
  },

  async createAppointment(
    businessId: string,
    data: {
      clientId: string;
      petId: string;
      staffId?: string;
      serviceId?: string;
      date: Date;
      startTime: string;
      endTime: string;
      priceCents?: number;
      depositCents?: number;
      notes?: string;
    }
  ) {
    // Referenced client/pet must belong to this tenant, or the create is rejected.
    const client = await prisma.client.findFirst({ where: { id: data.clientId, businessId } });
    const pet = await prisma.pet.findFirst({ where: { id: data.petId, businessId } });
    if (!client || !pet) throw new Error("Client or pet not found for this business");
    return prisma.appointment.create({ data: { ...data, businessId } });
  },

  async setAppointmentStatus(businessId: string, id: string, status: AppointmentStatus) {
    const appt = await prisma.appointment.findFirst({ where: { id, businessId } });
    if (!appt) throw new Error("Appointment not found");
    return prisma.appointment.update({ where: { id: appt.id }, data: { status } });
  },

  // ----- Reservations (boarding / daycare) with capacity guard -----
  listReservations(businessId: string) {
    return prisma.reservation.findMany({
      where: { businessId },
      orderBy: { startDate: "asc" },
      include: { client: true, pet: true, kennel: true },
    });
  },

  /**
   * Assign a kennel to a reservation, refusing to exceed the kennel's capacity
   * for any overlapping date range (server-enforced no double-booking).
   */
  async assignKennel(businessId: string, reservationId: string, kennelId: string) {
    const reservation = await prisma.reservation.findFirst({ where: { id: reservationId, businessId } });
    if (!reservation) throw new Error("Reservation not found");
    const kennel = await prisma.kennel.findFirst({ where: { id: kennelId, businessId } });
    if (!kennel) throw new Error("Kennel not found");

    const overlapping = await prisma.reservation.count({
      where: {
        businessId,
        kennelId,
        id: { not: reservationId },
        status: { in: ["confirmed", "checked_in"] },
        startDate: { lte: reservation.endDate },
        endDate: { gte: reservation.startDate },
      },
    });
    if (overlapping >= kennel.capacity) {
      throw new Error(`Kennel ${kennel.name} is at capacity for those dates`);
    }

    return prisma.reservation.update({
      where: { id: reservation.id },
      data: { kennelId, status: reservation.status === "requested" ? "confirmed" : reservation.status },
    });
  },

  async setReservationStatus(businessId: string, id: string, status: ReservationStatus) {
    const reservation = await prisma.reservation.findFirst({ where: { id, businessId } });
    if (!reservation) throw new Error("Reservation not found");
    return prisma.reservation.update({ where: { id: reservation.id }, data: { status } });
  },

  // ----- Invoices -----
  listInvoices(businessId: string) {
    return prisma.invoice.findMany({
      where: { businessId },
      orderBy: { dueDate: "asc" },
      include: { client: true },
    });
  },

  async setInvoiceStatus(businessId: string, id: string, status: InvoiceStatus) {
    const invoice = await prisma.invoice.findFirst({ where: { id, businessId } });
    if (!invoice) throw new Error("Invoice not found");
    return prisma.invoice.update({ where: { id: invoice.id }, data: { status } });
  },

  // ----- Notifications -----
  listNotifications(businessId: string) {
    return prisma.notification.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  },

  async setNotificationStatus(businessId: string, id: string, status: NotificationStatus) {
    const n = await prisma.notification.findFirst({ where: { id, businessId } });
    if (!n) throw new Error("Notification not found");
    return prisma.notification.update({ where: { id: n.id }, data: { status, sentAt: status === "sent" ? new Date() : n.sentAt } });
  },

  // ----- Audit -----
  recordAudit(
    businessId: string,
    data: { actorId?: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }
  ) {
    return prisma.auditEvent.create({
      data: {
        businessId,
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  },

  listAudit(businessId: string) {
    return prisma.auditEvent.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 100 });
  },
};

export type Db = typeof db;
