import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";

/** Prefer `BETTER_AUTH_SECRET` in all real environments; this fallback only satisfies local/build when unset. */
const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  "kalarica-local-dev-secret-min-32-chars-rotate-for-prod";

function normalizeOrigin(url: string | undefined): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;
  return t.replace(/\/$/, "");
}

const baseURL = normalizeOrigin(process.env.BETTER_AUTH_URL) ?? "http://localhost:3000";

const extraTrustedOrigins =
  process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((o) => normalizeOrigin(o))
    .filter((o): o is string => Boolean(o)) ?? [];

const trustedOrigins = [
  ...new Set(
    [
      baseURL,
      normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL),
      ...extraTrustedOrigins,
    ].filter((o): o is string => Boolean(o)),
  ),
];

export const auth = betterAuth({
  appName: "Kalarica",
  secret: authSecret,
  baseURL,
  trustedOrigins,
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
