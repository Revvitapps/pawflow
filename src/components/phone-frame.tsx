"use client";

import { createContext, useContext, useState } from "react";

const PhoneFrameContainerContext = createContext<HTMLDivElement | null>(null);

/** Radix portals (Sheet/Dialog/Select) default to document.body, which
 * escapes the frame below. Components render their portal into this
 * container instead so overlays stay confined to the phone's edges. */
export function usePhoneFrameContainer() {
  return useContext(PhoneFrameContainerContext);
}

/** Always presents the app inside a phone-shaped frame on anything wider
 * than a real phone — the product being sold is "the App" itself, so a
 * laptop viewing a shared demo link should see a phone, not a stretched
 * webpage. The frame body carries a CSS transform, which makes it the
 * containing block for every `position: fixed` descendant (bottom nav,
 * feedback button) — they end up pinned to the phone's edges instead of
 * the browser window's, with no changes needed to how those components
 * position themselves. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-100 p-0 sm:bg-gradient-to-br sm:from-[#eef8f6] sm:via-zinc-50 sm:to-[#fdeee5] sm:p-6">
      <div
        ref={setContainer}
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-[min(844px,88dvh)] sm:w-[390px] sm:rounded-[52px] sm:border-[10px] sm:border-zinc-900 sm:shadow-2xl sm:shadow-black/30"
        style={{ transform: "translateZ(0)" }}
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-900 sm:block" />
        <PhoneFrameContainerContext.Provider value={container}>
          {children}
        </PhoneFrameContainerContext.Provider>
      </div>
    </div>
  );
}
