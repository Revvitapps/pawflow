import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateClientAction } from "../../actions";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { customerId } = await params;
  const { error } = await searchParams;
  const client = await db.getClient(session.user.businessId, customerId);
  if (!client) notFound();

  return (
    <div className="space-y-4">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="size-4" /> All clients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{client.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          <form action={updateClientAction} className="space-y-3">
            <input type="hidden" name="id" value={client.id} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Name</label>
              <Input name="name" defaultValue={client.name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Phone</label>
                <Input name="phone" defaultValue={client.phone} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Email</label>
                <Input name="email" defaultValue={client.email} />
              </div>
            </div>
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pets ({client.pets.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {client.pets.length === 0 ? (
            <p className="text-sm text-zinc-500">No pets on file.</p>
          ) : (
            client.pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2"
              >
                <span className="text-sm font-medium text-zinc-900">{pet.name}</span>
                <span className="text-xs text-zinc-500">{pet.breed || "—"}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {client.invoices.length === 0 ? (
            <p className="text-sm text-zinc-500">No invoices.</p>
          ) : (
            client.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2">
                <span className="text-sm text-zinc-700">{inv.label}</span>
                <span className="flex items-center gap-2 text-sm">
                  {money(inv.amountCents)}
                  <Badge variant="secondary">{inv.status}</Badge>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
