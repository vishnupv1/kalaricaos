import { getServerSession } from "@/server/auth/session";
import { canAccessModule } from "@/server/auth/rbac";
import { getAppRoleFromSession, getUserIdFromSession } from "@/lib/session-user";
import type { AppRole } from "@/generated/prisma";

export type ModuleActionContext = {
  userId: string;
  role: AppRole;
};

/** For server actions: returns null if unauthenticated or missing module access (no redirect). */
export async function getModuleActionContext(module: string): Promise<ModuleActionContext | null> {
  const session = await getServerSession();
  const userId = getUserIdFromSession(session);
  if (!userId || !session?.user) {
    return null;
  }
  const role = getAppRoleFromSession(session);
  if (!canAccessModule(role, module)) {
    return null;
  }
  return { userId, role };
}
