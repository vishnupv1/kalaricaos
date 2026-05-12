import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getServerSession } from "@/server/auth/session";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return <DashboardShell userEmail={session.user.email}>{children}</DashboardShell>;
}
