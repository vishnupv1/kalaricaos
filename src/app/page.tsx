import Link from "next/link";

import { KalaricaLogo } from "@/components/brand/kalarica-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="outline-none ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <KalaricaLogo variant="header" priority />
        </Link>
        <div className="flex gap-2">
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }))}>
            Sign in
          </Link>
          <Link href="/dashboard" className={cn(buttonVariants())}>
            Open console
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col justify-center px-6 pb-24 pt-12 md:px-12">
        <KalaricaLogo variant="hero" className="mb-8" priority />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Internal platform</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
          The operating system for how Kalarica runs.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Finance, vendors, inventory, CRM, and production — one minimal, fast surface. Start from the backbone: auth,
          roles, then operational modules.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/sign-in" className={cn(buttonVariants({ size: "lg" }))}>
            Sign in
          </Link>
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
