import { redirect } from "next/navigation";

import { getAppRoleFromSession } from "@/lib/session-user";
import { getServerSession } from "@/server/auth/session";
import { canAccessModule } from "@/server/auth/rbac";

export async function requireExpensesAccess() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  const role = getAppRoleFromSession(session);
  if (!canAccessModule(role, "expenses")) {
    redirect("/dashboard");
  }
}
