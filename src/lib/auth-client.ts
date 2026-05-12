import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  /** Omit to use same-origin `/api/auth` in the browser. */
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
