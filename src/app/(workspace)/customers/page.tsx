import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientAction } from "../actions";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;
  const clients = await db.listClients(session.user.businessId);

  return (
    <div className="space-y-4">
      <details className="rounded-2xl border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">+ New client</summary>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <form action={createClientAction} className="mt-3 space-y-3">
          <Input name="name" placeholder="Client name" required />
          <div className="grid grid-cols-2 gap-3">
            <Input name="phone" placeholder="Phone" />
            <Input name="email" placeholder="Email" />
          </div>
          <Input name="notes" placeholder="Notes (optional)" />
          <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
            Add client
          </Button>
        </form>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Clients ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 ? (
            <p className="text-sm text-zinc-500">No clients yet. Add your first client above.</p>
          ) : (
            clients.map((client) => (
              <Link
                key={client.id}
                href={`/customers/${client.id}`}
                className="block rounded-2xl border border-zinc-100 bg-white p-4 transition hover:border-zinc-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-lg font-semibold text-zinc-900">{client.name}</p>
                    <p className="text-sm text-zinc-500">
                      {client.phone || "No phone"} · {client.email || "No email"}
                    </p>
                  </div>
                  {client.balanceCents > 0 ? (
                    <Badge variant="destructive">{money(client.balanceCents)} due</Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {client.pets.length === 0 ? (
                    <span className="text-xs text-zinc-400">No pets on file</span>
                  ) : (
                    client.pets.map((pet) => (
                      <Badge key={pet.id} variant="secondary">
                        {pet.name}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </Badge>
                    ))
                  )}
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
