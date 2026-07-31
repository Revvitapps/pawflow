import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getRevSign } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";
import { SignForm } from "@/components/signatures/sign-form";
import { submitSignatureAction, declineSignatureAction } from "./actions";

export const dynamic = "force-dynamic";

function Shell({ issuerName, children }: { issuerName?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl bg-white px-4 py-8 sm:py-12">
      {issuerName ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
          {issuerName}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Notice({
  tone,
  icon,
  title,
  body,
  action,
}: {
  tone: "ok" | "warn" | "bad";
  icon: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const ring = tone === "ok" ? "border-emerald-200" : tone === "bad" ? "border-rose-200" : "border-zinc-200";
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border ${ring} bg-white p-5 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium text-zinc-900">{title}</p>
          {body ? <p className="text-sm text-zinc-500">{body}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export default async function SignPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const revsign = getRevSign(await getOrigin());
  const signer = await revsign.resolveSigner(token);

  if (!signer) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <h1 className="text-xl font-semibold text-zinc-900">This signing link is invalid or has expired</h1>
        <p className="text-sm text-zinc-500">Please contact the business that sent it for a new link.</p>
      </div>
    );
  }

  const request = signer.request;
  // Issuer name is shown only to a holder of a valid signing token.
  const business = await prisma.business.findUnique({
    where: { id: request.tenantId },
    select: { name: true },
  });
  const issuerName = business?.name ?? "PawFlow";

  if (request.status === "COMPLETED") {
    return (
      <Shell issuerName={issuerName}>
        <Notice
          tone="ok"
          icon={<CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />}
          title="This document has been fully signed. Thank you."
          body="Download your completed copy, including the certificate of completion."
          action={
            <a
              href={`/sign/${token}/signed`}
              className="inline-flex items-center gap-2 rounded-full bg-[#79c6bf] px-4 py-2.5 text-sm font-semibold text-zinc-900"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          }
        />
      </Shell>
    );
  }

  if (signer.status === "SIGNED") {
    return (
      <Shell issuerName={issuerName}>
        <Notice
          tone="ok"
          icon={<CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />}
          title={`You've signed “${request.title}”.`}
          body="Thank you. A copy will be emailed to you once everyone has signed."
        />
      </Shell>
    );
  }

  if (signer.status === "DECLINED" || request.status === "DECLINED") {
    return (
      <Shell issuerName={issuerName}>
        <Notice
          tone="bad"
          icon={<XCircle className="h-8 w-8 shrink-0 text-rose-500" />}
          title="This signing request was declined."
        />
      </Shell>
    );
  }

  if (request.status === "VOIDED") {
    return (
      <Shell issuerName={issuerName}>
        <Notice
          tone="warn"
          icon={<AlertTriangle className="h-8 w-8 shrink-0 text-zinc-400" />}
          title="This signing request has been cancelled by the business."
        />
      </Shell>
    );
  }

  return (
    <Shell issuerName={issuerName}>
      <header className="mb-4 space-y-1">
        <h1 className="font-heading text-2xl font-semibold text-zinc-900">{request.title}</h1>
        <p className="text-sm text-zinc-500">
          {issuerName} has asked {signer.name} to review and sign this document.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {request.message ? (
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {request.message}
        </div>
      ) : null}

      <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Review the document</h2>
        <object
          data={`/sign/${token}/document`}
          type="application/pdf"
          className="h-[60vh] w-full rounded-lg border border-zinc-200"
        >
          <p className="text-sm text-zinc-500">
            Your browser can&apos;t display the PDF inline.{" "}
            <a
              href={`/sign/${token}/document`}
              target="_blank"
              rel="noreferrer"
              className="text-[#3a938c] hover:underline"
            >
              Open it in a new tab
            </a>
            .
          </p>
        </object>
      </section>

      <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Your signature</h2>
        <SignForm action={submitSignatureAction.bind(null, token)} signerName={signer.name} issuerName={issuerName} />
      </section>

      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800">
          I don&apos;t want to sign this
        </summary>
        <form
          action={declineSignatureAction.bind(null, token)}
          className="mt-3 space-y-2 rounded-2xl border border-zinc-200 p-3"
        >
          <textarea
            name="reason"
            rows={2}
            required
            placeholder="Briefly, why are you declining? (shared with the business)"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-300"
          >
            Decline to sign
          </button>
        </form>
      </details>
    </Shell>
  );
}
