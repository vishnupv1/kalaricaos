import type { Session } from "@/lib/auth";
import { AppRole } from "@/generated/prisma";

const ROLE_VALUES = new Set<string>(Object.values(AppRole));

export function parseAppRole(value: unknown): AppRole {
  if (typeof value === "string" && ROLE_VALUES.has(value)) {
    return value as AppRole;
  }
  return AppRole.SALES_USER;
}

export function getAppRoleFromSession(session: Session | null): AppRole {
  const u = session?.user as { role?: unknown } | undefined;
  return parseAppRole(u?.role);
}

export function getUserIdFromSession(session: Session | null): string | null {
  const id = session?.user?.id;
  return typeof id === "string" ? id : null;
}
