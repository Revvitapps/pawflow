import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      businessId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    businessId: string;
    role: UserRole;
    tokenVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    businessId: string;
    role: UserRole;
    tokenVersion: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    businessId: string;
    role: UserRole;
    tokenVersion: number;
  }
}
