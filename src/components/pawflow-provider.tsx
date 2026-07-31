"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

import { createDemoWorkspace, createStarterWorkspace } from "@/lib/demo-data";
import type {
  AIInteraction,
  Appointment,
  AppointmentStatus,
  BoardingStay,
  Customer,
  DemoWorkspaceState,
  GroomingNoteInput,
  Message,
  MissedCallPayload,
  Payment,
  PaymentStatus,
  Pet,
  PortalRequestPayload,
  SetupWorkspacePayload,
} from "@/lib/types";

const STORAGE_KEY = "pawflow-demo-workspace-v1";

function normalizeWorkspace(workspace: DemoWorkspaceState): DemoWorkspaceState {
  const demo = createDemoWorkspace();

  if (workspace.organization.workspaceMode === "demo") {
    return {
      ...workspace,
      organization: {
        ...workspace.organization,
        brand: {
          ...demo.organization.brand,
          ...workspace.organization.brand,
          logoUrl: workspace.organization.brand.logoUrl || demo.organization.brand.logoUrl,
        },
      },
    };
  }

  return workspace;
}

type HydrationAction = { type: "hydrated" };

type BusinessSettingsPatch = Partial<
  Pick<
    DemoWorkspaceState["organization"],
    | "websiteUrl"
    | "contactEmail"
    | "contactPhone"
    | "address"
    | "socialLinks"
    | "hours"
    | "boardingCapacity"
    | "cancellationPolicy"
    | "depositPolicy"
    | "vaccineRequirements"
    | "aiGuardrails"
  >
>;

type ServicePatch = Partial<
  Pick<
    DemoWorkspaceState["services"][number],
    "name" | "price" | "durationMinutes" | "depositAmount" | "description"
  >
>;

type WorkspaceAction =
  | { type: "reset" }
  | { type: "hydrate"; payload: DemoWorkspaceState }
  | { type: "start-business-setup"; payload: SetupWorkspacePayload }
  | { type: "create-intake"; payload: { request: PortalRequestPayload; aiSummary: string } }
  | { type: "approve-intake"; payload: { intakeRequestId: string } }
  | { type: "update-appointment-status"; payload: { appointmentId: string; status: AppointmentStatus } }
  | { type: "create-appointment"; payload: Appointment }
  | { type: "add-grooming-note"; payload: GroomingNoteInput & { stylist: string } }
  | { type: "create-boarding-request"; payload: { request: PortalRequestPayload; aiSummary: string } }
  | { type: "update-boarding"; payload: BoardingStay }
  | { type: "assign-room"; payload: { stayId: string; room: string } }
  | { type: "checkout-boarding"; payload: { stayId: string } }
  | { type: "add-message"; payload: Message }
  | { type: "add-ai-log"; payload: AIInteraction }
  | { type: "toggle-automation"; payload: { key: string } }
  | {
      type: "update-brand";
      payload: Partial<DemoWorkspaceState["organization"]["brand"]>;
    }
  | {
      type: "update-business";
      payload: BusinessSettingsPatch;
    }
  | {
      type: "update-service";
      payload: { serviceId: string; patch: ServicePatch };
    }
  | { type: "update-customer"; payload: { customerId: string; patch: Partial<Customer> } }
  | { type: "update-pet"; payload: { petId: string; patch: Partial<Pet> } }
  | { type: "update-appointment"; payload: { appointmentId: string; patch: Partial<Appointment> } }
  | { type: "add-payment"; payload: Payment }
  | { type: "update-payment"; payload: { paymentId: string; patch: Partial<Payment> } }
  | { type: "update-payment-status"; payload: { paymentId: string; status: PaymentStatus } }
  | { type: "update-message"; payload: { messageId: string; patch: Partial<Message> } }
  | { type: "simulate-missed-call"; payload: { input: MissedCallPayload; textBack: string; intent: string } };

function reducer(state: DemoWorkspaceState, action: WorkspaceAction): DemoWorkspaceState {
  switch (action.type) {
    case "reset":
      return createDemoWorkspace();
    case "hydrate":
      return normalizeWorkspace(action.payload);
    case "start-business-setup":
      return createStarterWorkspace(action.payload);
    case "create-intake": {
      const customerId = crypto.randomUUID();
      const petId = crypto.randomUUID();
      const intakeId = crypto.randomUUID();
      const today = new Date().toISOString();

      return {
        ...state,
        customers: [
          ...state.customers,
          {
            id: customerId,
            organizationId: state.organization.id,
            name: action.payload.request.customerName,
            phone: action.payload.request.phone,
            email: action.payload.request.email,
            preferredChannel: "sms",
            tags: ["new lead"],
            notes: [action.payload.request.specialNotes || "Portal request submitted."],
            balanceCents: 0,
          },
        ],
        pets: [
          ...state.pets,
          {
            id: petId,
            organizationId: state.organization.id,
            customerId,
            name: action.payload.request.petName,
            breed: action.payload.request.breed,
            age: "Unknown",
            weight: "Unknown",
            allergies: [],
            groomingNotes: [],
            behaviorAlerts: action.payload.request.behaviorConcerns
              ? [
                  {
                    id: crypto.randomUUID(),
                    petId,
                    label: action.payload.request.behaviorConcerns,
                    severity: "medium",
                  },
                ]
              : [],
            vaccineRecords: [],
            cutPreferences: "",
            boardingNotes: action.payload.request.specialNotes,
            sameAsLastTime: "",
          },
        ],
        intakeRequests: [
          ...state.intakeRequests,
          {
            id: intakeId,
            organizationId: state.organization.id,
            customerId,
            petId,
            type: action.payload.request.requestType,
            serviceLabel: action.payload.request.serviceNeeded,
            preferredDates: action.payload.request.preferredDates,
            specialNotes: action.payload.request.specialNotes,
            behaviorConcerns: action.payload.request.behaviorConcerns,
            vaccineStatus: action.payload.request.vaccineStatus,
            status: "new",
            aiSummary: action.payload.aiSummary,
            createdAt: today,
          },
        ],
      };
    }
    case "approve-intake": {
      const intake = state.intakeRequests.find((item) => item.id === action.payload.intakeRequestId);
      if (!intake) return state;
      const matchingService = state.services.find((service) =>
        service.name.toLowerCase().includes(intake.serviceLabel.toLowerCase().split(" ")[0]),
      );
      const firstStaff = state.staff[0];
      const createdAppointment: Appointment = {
        id: crypto.randomUUID(),
        organizationId: state.organization.id,
        customerId: intake.customerId,
        petId: intake.petId,
        staffId: firstStaff.id,
        serviceId: matchingService?.id || state.services[0].id,
        date: intake.preferredDates.split(",")[0]?.trim() || new Date().toISOString().slice(0, 10),
        startTime: "09:30",
        endTime: "11:00",
        price: matchingService?.price || 95,
        deposit: matchingService?.depositAmount || 0,
        status: "confirmed",
        notes: intake.specialNotes,
        noShowRisk: "medium",
        reminderEnabled: true,
      };

      return {
        ...state,
        intakeRequests: state.intakeRequests.map((item) =>
          item.id === intake.id ? { ...item, status: "scheduled" } : item,
        ),
        appointments: [...state.appointments, createdAppointment],
      };
    }
    case "update-appointment-status":
      return {
        ...state,
        appointments: state.appointments.map((appointment) =>
          appointment.id === action.payload.appointmentId
            ? { ...appointment, status: action.payload.status }
            : appointment,
        ),
      };
    case "create-appointment":
      return { ...state, appointments: [...state.appointments, action.payload] };
    case "add-grooming-note":
      return {
        ...state,
        pets: state.pets.map((pet) =>
          pet.id === action.payload.petId
            ? {
                ...pet,
                cutPreferences: action.payload.cutPreference || pet.cutPreferences,
                sameAsLastTime: action.payload.sameAsLastTime ? "Same as last time" : pet.sameAsLastTime,
                allergies: action.payload.allergy ? [...new Set([...pet.allergies, action.payload.allergy])] : pet.allergies,
                behaviorAlerts: action.payload.behaviorAlert
                  ? [
                      ...pet.behaviorAlerts,
                      {
                        id: crypto.randomUUID(),
                        petId: pet.id,
                        label: action.payload.behaviorAlert,
                        severity: "medium",
                      },
                    ]
                  : pet.behaviorAlerts,
                groomingNotes: [
                  {
                    id: crypto.randomUUID(),
                    petId: pet.id,
                    createdAt: new Date().toISOString(),
                    stylist: action.payload.stylist,
                    note: action.payload.note,
                    cutPreference: action.payload.cutPreference,
                    sameAsLastTime: action.payload.sameAsLastTime,
                  },
                  ...pet.groomingNotes,
                ],
              }
            : pet,
        ),
      };
    case "create-boarding-request": {
      const customerId = crypto.randomUUID();
      const petId = crypto.randomUUID();
      const stayId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      return {
        ...state,
        customers: [
          ...state.customers,
          {
            id: customerId,
            organizationId: state.organization.id,
            name: action.payload.request.customerName,
            phone: action.payload.request.phone,
            email: action.payload.request.email,
            preferredChannel: "sms",
            tags: ["boarding lead"],
            notes: [action.payload.aiSummary],
            balanceCents: 0,
          },
        ],
        pets: [
          ...state.pets,
          {
            id: petId,
            organizationId: state.organization.id,
            customerId,
            name: action.payload.request.petName,
            breed: action.payload.request.breed,
            age: "Unknown",
            weight: "Unknown",
            allergies: [],
            groomingNotes: [],
            behaviorAlerts: [],
            vaccineRecords: [],
            cutPreferences: "",
            boardingNotes: action.payload.request.specialNotes,
            sameAsLastTime: "",
          },
        ],
        boardingStays: [
          ...state.boardingStays,
          {
            id: stayId,
            organizationId: state.organization.id,
            customerId,
            petId,
            room: "Unassigned",
            startDate: action.payload.request.preferredDates.split("to")[0]?.trim() || new Date().toISOString().slice(0, 10),
            endDate: action.payload.request.preferredDates.split("to")[1]?.trim() || new Date().toISOString().slice(0, 10),
            status: "requested",
            feedingNotes: action.payload.request.specialNotes,
            medicationNotes: "",
            vaccineStatus: action.payload.request.vaccineStatus.toLowerCase().includes("current") ? "clear" : "attention",
            photoUpdates: [`Request logged ${createdAt.slice(0, 10)}`],
          },
        ],
      };
    }
    case "update-boarding":
      return {
        ...state,
        boardingStays: state.boardingStays.map((stay) => (stay.id === action.payload.id ? action.payload : stay)),
      };
    case "assign-room":
      return {
        ...state,
        boardingStays: state.boardingStays.map((stay) =>
          stay.id === action.payload.stayId
            ? { ...stay, room: action.payload.room, status: stay.status === "requested" ? "confirmed" : stay.status }
            : stay,
        ),
      };
    case "checkout-boarding":
      return {
        ...state,
        boardingStays: state.boardingStays.map((stay) =>
          stay.id === action.payload.stayId ? { ...stay, status: "checked-out" } : stay,
        ),
      };
    case "add-message":
      return { ...state, messages: [action.payload, ...state.messages] };
    case "add-ai-log":
      return { ...state, aiInteractions: [action.payload, ...state.aiInteractions] };
    case "toggle-automation":
      return {
        ...state,
        automations: state.automations.map((automation) =>
          automation.key === action.payload.key ? { ...automation, enabled: !automation.enabled } : automation,
        ),
      };
    case "update-brand":
      return {
        ...state,
        organization: {
          ...state.organization,
          brand: { ...state.organization.brand, ...action.payload },
        },
      };
    case "update-business":
      return {
        ...state,
        organization: { ...state.organization, ...action.payload },
      };
    case "update-service":
      return {
        ...state,
        services: state.services.map((service) =>
          service.id === action.payload.serviceId ? { ...service, ...action.payload.patch } : service,
        ),
      };
    case "update-customer":
      return {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.payload.customerId ? { ...customer, ...action.payload.patch } : customer,
        ),
      };
    case "update-pet":
      return {
        ...state,
        pets: state.pets.map((pet) =>
          pet.id === action.payload.petId ? { ...pet, ...action.payload.patch } : pet,
        ),
      };
    case "update-appointment":
      return {
        ...state,
        appointments: state.appointments.map((appointment) =>
          appointment.id === action.payload.appointmentId ? { ...appointment, ...action.payload.patch } : appointment,
        ),
      };
    case "add-payment":
      return {
        ...state,
        payments: [action.payload, ...state.payments],
      };
    case "update-payment":
      return {
        ...state,
        payments: state.payments.map((payment) =>
          payment.id === action.payload.paymentId ? { ...payment, ...action.payload.patch } : payment,
        ),
      };
    case "update-payment-status":
      return {
        ...state,
        payments: state.payments.map((payment) =>
          payment.id === action.payload.paymentId ? { ...payment, status: action.payload.status } : payment,
        ),
      };
    case "update-message":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.payload.messageId ? { ...message, ...action.payload.patch } : message,
        ),
      };
    case "simulate-missed-call":
      return {
        ...state,
        missedCalls: [
          {
            id: crypto.randomUUID(),
            customerName: action.payload.input.customerName,
            phone: action.payload.input.phone,
            summary: action.payload.input.message,
            intent: (action.payload.intent as DemoWorkspaceState["missedCalls"][number]["intent"]) || "other",
            textBack: action.payload.textBack,
            createdAt: new Date().toISOString(),
          },
          ...state.missedCalls,
        ],
      };
    default:
      return state;
  }
}

type ProviderValue = {
  workspace: DemoWorkspaceState;
  resetWorkspace: () => void;
  startBusinessSetup: (payload: SetupWorkspacePayload) => void;
  createIntakeRequest: (request: PortalRequestPayload, aiSummary: string) => void;
  approveIntakeRequest: (intakeRequestId: string) => void;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void;
  createAppointment: (appointment: Appointment) => void;
  addGroomingNote: (input: GroomingNoteInput, stylist: string) => void;
  createBoardingRequest: (request: PortalRequestPayload, aiSummary: string) => void;
  assignBoardingRoom: (stayId: string, room: string) => void;
  updateBoardingStay: (stay: BoardingStay) => void;
  checkoutBoardingStay: (stayId: string) => void;
  addMessage: (message: Omit<Message, "id" | "createdAt" | "status"> & Partial<Pick<Message, "status">>) => void;
  addAiLog: (task: AIInteraction["task"], inputSummary: string, output: string) => void;
  toggleAutomation: (key: string) => void;
  updateBrandSettings: (payload: Partial<DemoWorkspaceState["organization"]["brand"]>) => void;
  updateBusinessSettings: (payload: BusinessSettingsPatch) => void;
  updateService: (serviceId: string, patch: ServicePatch) => void;
  updateCustomer: (customerId: string, patch: Partial<Customer>) => void;
  updatePet: (petId: string, patch: Partial<Pet>) => void;
  updateAppointment: (appointmentId: string, patch: Partial<Appointment>) => void;
  addPayment: (payment: Omit<Payment, "id">) => void;
  updatePayment: (paymentId: string, patch: Partial<Payment>) => void;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus) => void;
  updateMessage: (messageId: string, patch: Partial<Message>) => void;
  simulateMissedCall: (input: MissedCallPayload, textBack: string, intent: string) => void;
  runAiTask: <T>(task: string, payload: T) => Promise<string>;
  hydrated: boolean;
};

const PawFlowContext = createContext<ProviderValue | null>(null);

function hydrationReducer(state: boolean, action: HydrationAction): boolean {
  switch (action.type) {
    case "hydrated":
      return true;
    default:
      return state;
  }
}

export function PawFlowProvider({ children }: { children: React.ReactNode }) {
  const [workspace, dispatch] = useReducer(reducer, undefined, createDemoWorkspace);
  const [hydrated, hydrationDispatch] = useReducer(hydrationReducer, false);

  useEffect(() => {
    try {
      const savedWorkspace = window.localStorage.getItem(STORAGE_KEY);
      if (savedWorkspace) {
        const parsedWorkspace = normalizeWorkspace(JSON.parse(savedWorkspace) as DemoWorkspaceState);
        if (parsedWorkspace.organization.workspaceMode === "demo") {
          window.localStorage.removeItem(STORAGE_KEY);
        } else {
          dispatch({ type: "hydrate", payload: parsedWorkspace });
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    hydrationDispatch({ type: "hydrated" });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (workspace.organization.workspaceMode === "demo") {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // Ignore storage failures so prototype pages stay usable.
    }
  }, [workspace, hydrated]);

  const value = useMemo<ProviderValue>(
    () => ({
      workspace,
      hydrated,
      resetWorkspace() {
        dispatch({ type: "reset" });
      },
      startBusinessSetup(payload) {
        dispatch({ type: "start-business-setup", payload });
      },
      createIntakeRequest(request, aiSummary) {
        dispatch({ type: "create-intake", payload: { request, aiSummary } });
      },
      approveIntakeRequest(intakeRequestId) {
        dispatch({ type: "approve-intake", payload: { intakeRequestId } });
      },
      updateAppointmentStatus(appointmentId, status) {
        dispatch({ type: "update-appointment-status", payload: { appointmentId, status } });
      },
      createAppointment(appointment) {
        dispatch({ type: "create-appointment", payload: appointment });
      },
      addGroomingNote(input, stylist) {
        dispatch({ type: "add-grooming-note", payload: { ...input, stylist } });
      },
      createBoardingRequest(request, aiSummary) {
        dispatch({ type: "create-boarding-request", payload: { request, aiSummary } });
      },
      assignBoardingRoom(stayId, room) {
        dispatch({ type: "assign-room", payload: { stayId, room } });
      },
      updateBoardingStay(stay) {
        dispatch({ type: "update-boarding", payload: stay });
      },
      checkoutBoardingStay(stayId) {
        dispatch({ type: "checkout-boarding", payload: { stayId } });
      },
      addMessage(message) {
        dispatch({
          type: "add-message",
          payload: {
            ...message,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            status: message.status || "sent",
          },
        });
      },
      addAiLog(task, inputSummary, output) {
        dispatch({
          type: "add-ai-log",
          payload: {
            id: crypto.randomUUID(),
            organizationId: workspace.organization.id,
            task,
            inputSummary,
            output,
            createdAt: new Date().toISOString(),
          },
        });
      },
      toggleAutomation(key) {
        dispatch({ type: "toggle-automation", payload: { key } });
      },
      updateBrandSettings(payload) {
        dispatch({ type: "update-brand", payload });
      },
      updateBusinessSettings(payload) {
        dispatch({ type: "update-business", payload });
      },
      updateService(serviceId, patch) {
        dispatch({ type: "update-service", payload: { serviceId, patch } });
      },
      updateCustomer(customerId, patch) {
        dispatch({ type: "update-customer", payload: { customerId, patch } });
      },
      updatePet(petId, patch) {
        dispatch({ type: "update-pet", payload: { petId, patch } });
      },
      updateAppointment(appointmentId, patch) {
        dispatch({ type: "update-appointment", payload: { appointmentId, patch } });
      },
      addPayment(payment) {
        dispatch({
          type: "add-payment",
          payload: {
            ...payment,
            id: crypto.randomUUID(),
          },
        });
      },
      updatePayment(paymentId, patch) {
        dispatch({ type: "update-payment", payload: { paymentId, patch } });
      },
      updatePaymentStatus(paymentId, status) {
        dispatch({ type: "update-payment-status", payload: { paymentId, status } });
      },
      updateMessage(messageId, patch) {
        dispatch({ type: "update-message", payload: { messageId, patch } });
      },
      simulateMissedCall(input, textBack, intent) {
        dispatch({ type: "simulate-missed-call", payload: { input, textBack, intent } });
      },
      async runAiTask(task, payload) {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, payload }),
        });
        const data = (await response.json()) as { output?: string };
        return data.output || "";
      },
    }),
    [workspace, hydrated],
  );

  return <PawFlowContext.Provider value={value}>{children}</PawFlowContext.Provider>;
}

export function usePawFlow() {
  const context = useContext(PawFlowContext);
  if (!context) {
    throw new Error("usePawFlow must be used inside PawFlowProvider");
  }

  return context;
}
