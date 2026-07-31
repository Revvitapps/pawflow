"use server";

import { signOut } from "@/auth";

/** Real sign-out: clears the NextAuth session cookie and returns to /login. */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
