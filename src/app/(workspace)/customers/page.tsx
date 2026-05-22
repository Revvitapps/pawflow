"use client";

import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { CustomerCard, EmptyState, MessageThread, PetProfileCard } from "@/components/pawflow-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  const { workspace } = usePawFlow();
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(workspace.customers[0]?.id || "");

  const filteredCustomers = workspace.customers.filter((customer) =>
    [customer.name, customer.email, customer.phone].some((value) => value.toLowerCase().includes(query.toLowerCase())),
  );
  const selectedCustomer = workspace.customers.find((customer) => customer.id === selectedCustomerId) || filteredCustomers[0];
  const customerPets = workspace.pets.filter((pet) => pet.customerId === selectedCustomer?.id);
  const customerMessages = workspace.messages.filter((message) => message.customerId === selectedCustomer?.id);
  const customerAppointments = workspace.appointments.filter((appointment) => appointment.customerId === selectedCustomer?.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Customer CRM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers, emails, phones..." />
            <div className="grid gap-4">
              {filteredCustomers.map((customer) => (
                <button key={customer.id} className="text-left" onClick={() => setSelectedCustomerId(customer.id)}>
                  <CustomerCard customer={customer} petCount={workspace.pets.filter((pet) => pet.customerId === customer.id).length} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {selectedCustomer ? (
          <>
            <Card className="rounded-[32px] border-white/80 bg-white/90">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">{selectedCustomer.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Contact</p>
                  <p className="mt-2 text-sm text-zinc-800">{selectedCustomer.phone}</p>
                  <p className="text-sm text-zinc-800">{selectedCustomer.email}</p>
                </div>
                <div className="rounded-[24px] bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Visit history</p>
                  <p className="mt-2 text-sm text-zinc-800">{customerAppointments.length} appointments</p>
                  <p className="text-sm text-zinc-800">Last visit {selectedCustomer.lastVisitAt || "new"}</p>
                </div>
                <div className="rounded-[24px] bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Payment status</p>
                  <p className="mt-2 text-sm text-zinc-800">${(selectedCustomer.balanceCents / 100).toFixed(2)} balance</p>
                  <p className="text-sm text-zinc-800">{selectedCustomer.preferredChannel} preferred</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {customerPets.map((pet) => (
                <PetProfileCard key={pet.id} pet={pet} owner={selectedCustomer} />
              ))}
            </div>

            <Card className="rounded-[32px] border-white/80 bg-white/90">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Message history</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {customerMessages.length ? (
                  customerMessages.map((message) => <MessageThread key={message.id} message={message} />)
                ) : (
                  <EmptyState title="No messages yet" body="Once messages are sent or received, the unified inbox history appears here." icon={() => null} />
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
