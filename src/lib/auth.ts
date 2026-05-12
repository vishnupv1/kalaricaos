import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";

/** Prefer `BETTER_AUTH_SECRET` in all real environments; this fallback only satisfies local/build when unset. */
const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  "kalarica-local-dev-secret-min-32-chars-rotate-for-prod";

export const auth = betterAuth({
  appName: "Kalarica",
  secret: authSecret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins:
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((o) => o.trim())
      .filter(Boolean) ?? ["http://localhost:3000"],
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "SALES_USER",
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
