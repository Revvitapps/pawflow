import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CustomersPage() {
  const session = await requireSession();
  const clients = await db.listClients(session.user.businessId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Clients ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 ? (
            <p className="text-sm text-zinc-500">No clients yet. New clients appear here once they book or are added.</p>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
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
                {client.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {client.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#f4fbfa] px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
