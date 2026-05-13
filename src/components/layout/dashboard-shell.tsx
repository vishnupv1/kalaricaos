"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { KalaricaLogo } from "@/components/brand/kalarica-logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/vendors", label: "Vendors" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/meta", label: "Meta sync" },
  { href: "/dashboard/meta/ads", label: "Meta ads" },
  { href: "/dashboard/meta/messages", label: "Meta messages" },
  { href: "/dashboard/orders", label: "Orders" },
] as const;

function getActiveNavHref(pathname: string): string | null {
  let best: string | null = null;

  for (const item of nav) {
    const matches =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (matches && (!best || item.href.length > best.length)) {
      best = item.href;
    }
  }

  return best;
}

function navLinkClassName(isActive: boolean) {
  return cn(
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/80"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
  );
}

function SidebarNavLink({
  href,
  label,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={navLinkClassName(isActive)}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

export function DashboardShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const mobileNavId = useId();
  const activeHref = getActiveNavHref(pathname);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    if (!mobileNavOpen) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="block outline-none ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar">
            <KalaricaLogo variant="sidebar" />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={item.href === activeHref}
            />
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
          <p className="truncate font-medium text-sidebar-foreground/90">{userEmail}</p>
          <p className="mt-1">Kalarica OS · Alpha</p>
          <SignOutButton />
        </div>
      </aside>
      <div className={cn("fixed inset-0 z-50 md:hidden", mobileNavOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!mobileNavOpen}>
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity",
            mobileNavOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileNavOpen(false)}
          tabIndex={mobileNavOpen ? 0 : -1}
        >
          <span className="sr-only">Close navigation menu</span>
        </button>
        <aside
          id={mobileNavId}
          className={cn(
            "absolute left-0 top-0 h-full w-[18rem] max-w-[90vw] border-r border-sidebar-border bg-sidebar shadow-xl transition-transform",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            <Link
              href="/dashboard"
              className="block outline-none ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              onClick={() => setMobileNavOpen(false)}
            >
              <KalaricaLogo variant="sidebar" />
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/80 outline-none ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              onClick={() => setMobileNavOpen(false)}
            >
              <span className="sr-only">Close navigation menu</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-3">
            {nav.map((item) => (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={item.href === activeHref}
                onNavigate={() => setMobileNavOpen(false)}
              />
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
            <p className="truncate font-medium text-sidebar-foreground/90">{userEmail}</p>
            <p className="mt-1">Kalarica OS · Alpha</p>
            <SignOutButton />
          </div>
        </aside>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border bg-card/60 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 outline-none ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
              aria-controls={mobileNavId}
            >
              {mobileNavOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
            <Link href="/dashboard">
              <KalaricaLogo variant="header" />
            </Link>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">Operations</div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
