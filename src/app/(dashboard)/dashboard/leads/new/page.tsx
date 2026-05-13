import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LeadForm } from "@/modules/leads/components/lead-form";
import { requireLeadsAccess } from "@/modules/leads/server/require-leads-access";

export default async function NewLeadPage() {
  await requireLeadsAccess();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/dashboard/leads" />}>
          ← Leads
        </Button>
        <h1 className="font-heading text-2xl font-semibold">Add lead</h1>
        <p className="text-sm text-muted-foreground">Create a lead manually outside Meta.</p>
      </div>
      <LeadForm mode="create" />
    </div>
  );
}
