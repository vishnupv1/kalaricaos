import type { AppRole } from "@/generated/prisma";

import { BusinessWalkthrough } from "@/modules/overview/components/business-walkthrough";
import { getBusinessOverview } from "@/modules/overview/server/overview-queries";
import { getServerSession } from "@/server/auth/session";

export default async function DashboardHomePage() {
  const session = await getServerSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role ?? "SALES_USER";
  const data = await getBusinessOverview(role);

  return (
    <BusinessWalkthrough
      userName={session?.user.name ?? null}
      userEmail={session?.user.email ?? null}
      role={role}
      data={data}
    />
  );
}
