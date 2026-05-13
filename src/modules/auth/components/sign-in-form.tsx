"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    const result = await authClient.signIn.email({
      email,
      password,
    });
    setPending(false);
    if (result?.error) {
      setError(result.error.message ?? "Could not sign in.");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <Card className="w-full max-w-md border-border/80 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl font-semibold">Sign in</CardTitle>
        <CardDescription>
          Use your Kalarica account. Run <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">npm run db:seed</code>{" "}
          after the first migration to create the default super admin.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              className="bg-background"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Continue"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Forgot password — wire up Better Auth email flow in Phase 1.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
