"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { createBusinessWithOwner, getUserByEmail } from "@/server/tenant";

function fail(message: string): never {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

export async function signupAction(formData: FormData) {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerName = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!businessName) fail("Business name is required.");
  if (!ownerName) fail("Your name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Enter a valid email address.");
  if (password.length < 8) fail("Password must be at least 8 characters.");

  const existing = await getUserByEmail(email);
  if (existing) fail("An account with that email already exists.");

  await createBusinessWithOwner({ businessName, ownerName, email, password });

  // Establish the real session immediately after provisioning the tenant.
  await signIn("credentials", { email, password, redirect: false });

  redirect("/dashboard");
}
