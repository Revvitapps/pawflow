export type Role = "owner" | "front-desk" | "staff" | "pet-parent";

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "checked-in"
  | "in-progress"
  | "ready"
  | "completed"
  | "cancelled"
  | "no-show";

export type BoardingStatus =
  | "requested"
  | "confirmed"
  | "checked-in"
  | "checked-out";

export type PaymentStatus = "paid" | "partial" | "unpaid" | "refunded";

export type MessageChannel = "sms" | "email" | "portal" | "ai-call";

export type MessageDirection = "inbound" | "outbound";

export type ReminderType =
  | "appointment"
  | "vaccine"
  | "review"
  | "reactivation"
  | "boarding-update";

export type IntakeType = "grooming" | "boarding" | "daycare";

export type AiTask =
  | "summarizeDay"
  | "summarizeIntakeRequest"
  | "generateCustomerReply"
  | "generateReadyForPickupMessage"
  | "generateReviewRequest"
  | "generateReviewReply"
  | "generateReactivationMessage"
  | "classifyInboundMessage"
  | "generateMissedCallTextBack"
  | "answerReceptionistQuestion";

export type FeedbackSentiment = "like" | "dislike" | "idea";

export interface BrandSettings {
  businessName: string;
  businessSlug: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  neutralColor: string;
  roundedScale: string;
  poweredByPawFlow: boolean;
  portalHeadline: string;
  portalSubcopy: string;
  notificationSignature: string;
}

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  category: "grooming" | "boarding" | "daycare" | "add-on";
  durationMinutes: number;
  price: number;
  depositRequired: boolean;
  depositAmount: number;
  description: string;
}

export interface StaffMember {
  id: string;
  organizationId: string;
  name: string;
  roleLabel: string;
  specialty: string;
  avatar: string;
  phone: string;
  color: string;
  isAvailableToday: boolean;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  preferredChannel: MessageChannel;
  tags: string[];
  notes: string[];
  balanceCents: number;
  lastVisitAt?: string;
}

export interface VaccineRecord {
  id: string;
  petId: string;
  name: string;
  expiresAt: string;
  status: "current" | "expiring-soon" | "expired" | "missing";
  uploadedBy: string;
}

export interface GroomingNote {
  id: string;
  petId: string;
  createdAt: string;
  stylist: string;
  note: string;
  cutPreference: string;
  sameAsLastTime: boolean;
}

export interface BehaviorAlert {
  id: string;
  petId: string;
  label: string;
  severity: "low" | "medium" | "high";
}

export interface Pet {
  id: string;
  organizationId: string;
  customerId: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  photoUrl?: string;
  allergies: string[];
  groomingNotes: GroomingNote[];
  behaviorAlerts: BehaviorAlert[];
  vaccineRecords: VaccineRecord[];
  cutPreferences: string;
  boardingNotes: string;
  sameAsLastTime: string;
  lastVisitAt?: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  customerId: string;
  petId: string;
  staffId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  deposit: number;
  status: AppointmentStatus;
  notes: string;
  noShowRisk: "low" | "medium" | "high";
  reminderEnabled: boolean;
}

export interface BoardingStay {
  id: string;
  organizationId: string;
  customerId: string;
  petId: string;
  room: string;
  startDate: string;
  endDate: string;
  status: BoardingStatus;
  feedingNotes: string;
  medicationNotes: string;
  vaccineStatus: "clear" | "attention";
  photoUpdates: string[];
}

export interface Payment {
  id: string;
  organizationId: string;
  customerId: string;
  appointmentId?: string;
  boardingStayId?: string;
  amount: number;
  depositAmount: number;
  status: PaymentStatus;
  method: "card" | "cash" | "square" | "stripe";
  dueDate: string;
  label: string;
}

export interface Message {
  id: string;
  organizationId: string;
  customerId?: string;
  petId?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  subject: string;
  body: string;
  createdAt: string;
  sender: string;
  status: "sent" | "draft" | "received";
  aiSuggested?: boolean;
}

export interface Reminder {
  id: string;
  organizationId: string;
  type: ReminderType;
  petId?: string;
  customerId?: string;
  dueAt: string;
  status: "queued" | "sent" | "draft";
  message: string;
}

export interface IntakeRequest {
  id: string;
  organizationId: string;
  customerId: string;
  petId: string;
  type: IntakeType;
  serviceLabel: string;
  preferredDates: string;
  specialNotes: string;
  behaviorConcerns: string;
  vaccineStatus: string;
  status: "new" | "approved" | "scheduled";
  aiSummary: string;
  createdAt: string;
}

export interface AIInteraction {
  id: string;
  organizationId: string;
  task: AiTask;
  inputSummary: string;
  output: string;
  createdAt: string;
}

export interface MissedCall {
  id: string;
  customerName: string;
  phone: string;
  summary: string;
  intent:
    | "grooming"
    | "boarding"
    | "pricing"
    | "availability"
    | "vaccine"
    | "urgent"
    | "other";
  textBack: string;
  createdAt: string;
}

export interface AutomationSetting {
  id: string;
  key: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  brand: BrandSettings;
  hours: string[];
  cancellationPolicy: string;
  depositPolicy: string;
  boardingCapacity: number;
  vaccineRequirements: string[];
  aiGuardrails: string[];
}

export interface DemoWorkspaceState {
  organization: Organization;
  staff: StaffMember[];
  services: Service[];
  customers: Customer[];
  pets: Pet[];
  appointments: Appointment[];
  boardingStays: BoardingStay[];
  payments: Payment[];
  messages: Message[];
  reminders: Reminder[];
  intakeRequests: IntakeRequest[];
  aiInteractions: AIInteraction[];
  automations: AutomationSetting[];
  missedCalls: MissedCall[];
}

export interface PortalRequestPayload {
  customerName: string;
  phone: string;
  email: string;
  petName: string;
  breed: string;
  serviceNeeded: string;
  preferredDates: string;
  specialNotes: string;
  behaviorConcerns: string;
  vaccineStatus: string;
  requestType: IntakeType;
}

export interface GroomingNoteInput {
  petId: string;
  note: string;
  cutPreference: string;
  sameAsLastTime: boolean;
  behaviorAlert?: string;
  allergy?: string;
}

export interface MissedCallPayload {
  customerName: string;
  phone: string;
  message: string;
}

export interface FeedbackEntry {
  id: string;
  route: string;
  pageLabel: string;
  section: string;
  sentiment: FeedbackSentiment;
  liked: string;
  disliked: string;
  suggestion: string;
  createdAt: string;
  source: "local" | "vercel";
}
