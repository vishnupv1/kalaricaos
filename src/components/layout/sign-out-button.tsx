"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await authClient.signOut();
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" className="mt-2 w-full border-sidebar-border" onClick={onSignOut} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
