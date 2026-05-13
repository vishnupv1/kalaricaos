import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetaMessagingAccessHealth } from "@/modules/meta/server/meta-messaging-health";

export function MetaMessagingSetupCard({ health }: { health: MetaMessagingAccessHealth }) {
  if (health.ok) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Messenger access OK</CardTitle>
          <CardDescription>
            Page token is valid with <code className="text-xs">pages_messaging</code> for page{" "}
            <code className="text-xs">{health.pageId}</code>.
            {health.resolvedFromUserToken
              ? " Resolved automatically from your User token via me/accounts."
              : null}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base">Messenger permission required</CardTitle>
        <CardDescription>
          {health.error ??
            "Meta rejected the conversations request. Your current META_PAGE_ACCESS_TOKEN cannot read Page Messenger threads."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {health.tokenType ? (
          <p>
            Token type: <span className="font-medium text-foreground">{health.tokenType}</span>
            {health.scopes?.length ? (
              <>
                {" "}
                · Scopes: <span className="font-mono text-xs">{health.scopes.join(", ")}</span>
              </>
            ) : null}
          </p>
        ) : null}
        {health.remediation?.length ? (
          <ol className="list-decimal space-y-2 pl-5">
            {health.remediation.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}
