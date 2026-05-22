"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { usePathname } from "next/navigation";
import { Lightbulb, MessageSquareMore, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackEntry, FeedbackSentiment } from "@/lib/types";

const STORAGE_KEY = "pawflow-feedback-v1";
const MAX_LOCAL_ENTRIES = 50;

type EntriesAction =
  | { type: "hydrate"; payload: FeedbackEntry[] }
  | { type: "prepend"; payload: FeedbackEntry }
  | { type: "replace"; payload: { id: string; entry: FeedbackEntry } };

const sentimentOptions: {
  value: FeedbackSentiment;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "like", label: "Like", icon: ThumbsUp },
  { value: "dislike", label: "Dislike", icon: ThumbsDown },
  { value: "idea", label: "Idea", icon: Lightbulb },
];

function routeToLabel(pathname: string) {
  if (pathname === "/") return "Marketing Homepage";
  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

export function FeedbackPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [entries, dispatch] = useReducer(
    (state: FeedbackEntry[], action: EntriesAction) => {
      switch (action.type) {
        case "hydrate":
          return action.payload;
        case "prepend":
          return [action.payload, ...state];
        case "replace":
          return state.map((item) => (item.id === action.payload.id ? action.payload.entry : item));
        default:
          return state;
      }
    },
    [],
  );
  const [sentiment, setSentiment] = useState<FeedbackSentiment>("idea");
  const [serverPersisted, setServerPersisted] = useState(false);
  const pageLabel = useMemo(() => routeToLabel(pathname), [pathname]);

  useEffect(() => {
    try {
      const local = window.localStorage.getItem(STORAGE_KEY);
      if (local) {
        dispatch({ type: "hydrate", payload: JSON.parse(local) as FeedbackEntry[] });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    fetch("/api/feedback", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { entries?: FeedbackEntry[]; persisted?: boolean }) => {
        if (Array.isArray(data.entries) && data.entries.length) {
          dispatch({ type: "hydrate", payload: data.entries });
        }
        setServerPersisted(Boolean(data.persisted));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES)));
    } catch {
      // Ignore quota errors and keep the in-memory notes list available.
    }
  }, [entries]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="fixed top-1/2 right-0 z-50 -translate-y-1/2 rounded-l-[22px] bg-zinc-900 px-3 py-5 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(61,58,57,0.22)] transition hover:bg-zinc-800">
          <span className="[writing-mode:vertical-rl]">Prototype Notes</span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto border-l-white/70 bg-[#fffaf7] sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl text-zinc-900">Prototype Feedback</SheetTitle>
          <SheetDescription className="text-sm text-zinc-600">
            Leave notes on any page so we can hash out what works, what does not, and what should be added next.
          </SheetDescription>
        </SheetHeader>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const entry: FeedbackEntry = {
              id: crypto.randomUUID(),
              route: pathname,
              pageLabel,
              section: String(formData.get("section") || ""),
              sentiment,
              liked: String(formData.get("liked") || ""),
              disliked: String(formData.get("disliked") || ""),
              suggestion: String(formData.get("suggestion") || ""),
              createdAt: new Date().toISOString(),
              source: serverPersisted ? "vercel" : "local",
            };

            dispatch({ type: "prepend", payload: entry });
            event.currentTarget.reset();
            setSentiment("idea");

            try {
              const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
              });
              const data = (await response.json()) as { persisted?: boolean; entry?: FeedbackEntry };
              setServerPersisted(Boolean(data.persisted));
              if (data.entry) {
                dispatch({ type: "replace", payload: { id: entry.id, entry: data.entry } });
              }
            } catch {
              // Local fallback already stored.
            }
          }}
        >
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">Current page</p>
            <p className="mt-2 font-medium text-zinc-900">{pageLabel}</p>
            <p className="mt-1 text-sm text-zinc-500">{pathname}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {sentimentOptions.map((option) => {
              const Icon = option.icon;
              const active = sentiment === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600"
                  }`}
                  onClick={() => setSentiment(option.value)}
                >
                  <Icon className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <Input name="section" placeholder="What section or area are you commenting on?" required />
          <Textarea name="liked" placeholder="What function or interaction do you like?" />
          <Textarea name="disliked" placeholder="What do you not like or what feels off?" />
          <Textarea name="suggestion" placeholder="What would you add or change?" required />

          <Button className="w-full rounded-full">
            <MessageSquareMore className="size-4" />
            Save prototype note
          </Button>

          <p className="text-xs text-zinc-500">
            Storage mode: {serverPersisted ? "shared Vercel blob" : "local browser fallback"}.
          </p>
        </form>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-xl font-semibold text-zinc-900">Saved Notes</h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-500">
              {entries.length} total
            </span>
          </div>
          {entries.length ? (
            entries.map((entry) => (
              <Card key={entry.id} className="rounded-[28px] border-white/80 bg-white/90">
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-lg text-zinc-900">{entry.section}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 capitalize">{entry.sentiment}</span>
                    <span>{entry.pageLabel}</span>
                    <span>{entry.createdAt.slice(0, 16).replace("T", " ")}</span>
                    <span>{entry.source}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-zinc-700">
                  {entry.liked ? (
                    <div>
                      <p className="font-semibold text-zinc-900">Like</p>
                      <p>{entry.liked}</p>
                    </div>
                  ) : null}
                  {entry.disliked ? (
                    <div>
                      <p className="font-semibold text-zinc-900">Dislike</p>
                      <p>{entry.disliked}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="font-semibold text-zinc-900">Suggestion</p>
                    <p>{entry.suggestion}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white/70 px-5 py-8 text-center text-sm text-zinc-500">
              No notes yet. Leave your first prototype comment from any page.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
