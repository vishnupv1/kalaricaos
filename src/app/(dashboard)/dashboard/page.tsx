import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ROLE_LABELS } from "@/types/app-role";
import { getServerSession } from "@/server/auth/session";
import type { AppRole } from "@/generated/prisma";

export default async function DashboardHomePage() {
  const session = await getServerSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role ?? "SALES_USER";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Welcome back{session?.user.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Foundation is live: authentication, roles, and data model. Next modules — vendors, products, and expenses —
          plug into the same services and RBAC layer.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Session</CardTitle>
            <CardDescription>Signed in via Better Auth + PostgreSQL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Email · </span>
              {session?.user.email}
            </p>
            <p>
              <span className="text-muted-foreground">Role · </span>
              {APP_ROLE_LABELS[role]}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Roadmap</CardTitle>
            <CardDescription>Build order from your execution plan.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-inside list-decimal space-y-2">
              <li>Vendor management CRUD</li>
              <li>Product catalog + media</li>
              <li>Expenses + approvals</li>
              <li>Inventory movements</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
