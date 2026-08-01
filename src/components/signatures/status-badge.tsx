const STYLES: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-zinc-100 text-zinc-600" },
  SENT: { label: "Sent", cls: "bg-sky-50 text-sky-700" },
  VIEWED: { label: "Viewed", cls: "bg-indigo-50 text-indigo-700" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  DECLINED: { label: "Declined", cls: "bg-rose-50 text-rose-700" },
  VOIDED: { label: "Voided", cls: "bg-zinc-100 text-zinc-500" },
};

const SIGNER_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-zinc-100 text-zinc-600" },
  VIEWED: { label: "Viewed", cls: "bg-indigo-50 text-indigo-700" },
  SIGNED: { label: "Signed", cls: "bg-emerald-50 text-emerald-700" },
  DECLINED: { label: "Declined", cls: "bg-rose-50 text-rose-700" },
};

export function StatusBadge({ status, signer = false }: { status: string; signer?: boolean }) {
  const map = signer ? SIGNER_STYLES : STYLES;
  const s = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
