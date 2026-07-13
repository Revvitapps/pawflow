"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { usePawFlow } from "@/components/pawflow-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const staySteps = ["requested", "confirmed", "checked-in", "checked-out"];

export default function BoardingStayDetailPage() {
  const params = useParams<{ stayId: string }>();
  const { workspace, updateBoardingStay, checkoutBoardingStay, addMessage } = usePawFlow();

  const stay = workspace.boardingStays.find((item) => item.id === params.stayId);
  const customer = workspace.customers.find((item) => item.id === stay?.customerId);
  const pet = workspace.pets.find((item) => item.id === stay?.petId);

  if (!stay) {
    return (
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="p-6">
          <p className="text-sm text-zinc-600">Boarding stay not found in the demo workspace.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Boarding stay detail</p>
          <h2 className="font-heading text-3xl font-semibold text-zinc-900">{pet?.name} · {stay.room}</h2>
        </div>
        <Link href="/boarding">
          <Button variant="outline" className="rounded-full">Back to boarding</Button>
        </Link>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Milestones</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {staySteps.map((step) => (
            <button
              key={step}
              type="button"
              className={`rounded-[24px] px-4 py-4 text-left text-sm ${step === stay.status ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-700"}`}
              onClick={() => updateBoardingStay({ ...stay, status: step as typeof stay.status })}
            >
              {step}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Editable stay details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const photoUpdate = String(formData.get("photoUpdate") || "").trim();
                updateBoardingStay({
                  ...stay,
                  room: String(formData.get("room") || ""),
                  startDate: String(formData.get("startDate") || ""),
                  endDate: String(formData.get("endDate") || ""),
                  status: String(formData.get("status") || stay.status) as typeof stay.status,
                  vaccineStatus: String(formData.get("vaccineStatus") || stay.vaccineStatus) as typeof stay.vaccineStatus,
                  feedingNotes: String(formData.get("feedingNotes") || ""),
                  medicationNotes: String(formData.get("medicationNotes") || ""),
                  photoUpdates: photoUpdate ? [photoUpdate, ...stay.photoUpdates] : stay.photoUpdates,
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="room" defaultValue={stay.room} placeholder="Room" />
                <select name="status" defaultValue={stay.status} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  {staySteps.map((step) => (
                    <option key={step} value={step}>{step}</option>
                  ))}
                </select>
                <Input name="startDate" defaultValue={stay.startDate} type="date" />
                <Input name="endDate" defaultValue={stay.endDate} type="date" />
                <select name="vaccineStatus" defaultValue={stay.vaccineStatus} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  <option value="clear">clear</option>
                  <option value="attention">attention</option>
                </select>
              </div>
              <Textarea name="feedingNotes" defaultValue={stay.feedingNotes} placeholder="Feeding notes" />
              <Textarea name="medicationNotes" defaultValue={stay.medicationNotes} placeholder="Medication notes" />
              <Textarea name="photoUpdate" placeholder="Add new photo update or boarding note" />
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-full">Save boarding stay</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => checkoutBoardingStay(stay.id)}>
                  Check out stay
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Related records</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {customer ? <Link href={`/customers/${customer.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Customer · {customer.name}</Link> : null}
              {pet ? <Link href={`/pets/${pet.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Pet · {pet.name}</Link> : null}
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Photo updates log</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {stay.photoUpdates.map((entry) => (
                <div key={entry} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">{entry}</div>
              ))}
            </CardContent>
          </Card>

          <Button
            className="rounded-full"
            onClick={() => {
              if (!customer || !pet) return;
              addMessage({
                organizationId: workspace.organization.id,
                customerId: customer.id,
                petId: pet.id,
                channel: "sms",
                direction: "outbound",
                subject: "Boarding update",
                body: `${pet.name} is doing great in ${stay.room}. We logged a new boarding update in the prototype.`,
                sender: "Boarding Desk",
              });
            }}
          >
            Send boarding update
          </Button>
        </div>
      </div>
    </div>
  );
}
