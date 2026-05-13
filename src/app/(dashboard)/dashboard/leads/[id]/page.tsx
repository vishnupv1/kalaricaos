import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadForm } from "@/modules/leads/components/lead-form";
import type { LeadFormInput } from "@/modules/leads/lib/lead-schemas";
import { getLeadById } from "@/modules/leads/server/lead-queries";
import { requireLeadsAccess } from "@/modules/leads/server/require-leads-access";

function toFormInput(lead: NonNullable<Awaited<ReturnType<typeof getLeadById>>>): LeadFormInput {
  return {
    fullName: lead.fullName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    source: lead.source ?? "",
    stage: lead.stage,
    notes: lead.notes ?? "",
  };
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLeadsAccess();
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) {
    notFound();
  }

  const created = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(lead.createdAt);

  const activityFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <LeadDetailHeader
        displayName={lead.fullName ?? lead.email ?? "Unnamed lead"}
        created={created}
        source={lead.source}
        stage={lead.stage}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <LeadForm mode="edit" leadId={lead.id} defaultValues={toFormInput(lead)} metaLeadId={lead.metaLeadId} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              lead.activities.map((activity) => (
                <div key={activity.id} className="border-b border-border/80 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">{formatEnumLabel(activity.type)}</p>
                  {activity.body ? <p className="mt-1 text-sm text-muted-foreground">{activity.body}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{activityFmt.format(activity.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LeadDetailHeader({
  displayName,
  created,
  source,
  stage,
}: {
  displayName: string;
  created: string;
  source: string | null;
  stage: string;
}) {
  return (
    <div className="space-y-1">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/dashboard/leads" />}>
        ← Leads
      </Button>
      <h1 className="font-heading text-2xl font-semibold">{displayName}</h1>
      <p className="text-sm text-muted-foreground">Created {created}</p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Badge variant="secondary">{formatEnumLabel(stage)}</Badge>
        {source ? (
          <Badge variant="outline" className="capitalize">
            {source}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
