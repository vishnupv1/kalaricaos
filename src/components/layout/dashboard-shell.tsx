import Link from "next/link";

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
  { href: "/dashboard/orders", label: "Orders" },
] as const;

export function DashboardShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
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
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">
          <p className="truncate font-medium text-sidebar-foreground/90">{userEmail}</p>
          <p className="mt-1">Kalarica OS · Alpha</p>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border bg-card/60 px-4 backdrop-blur md:px-8">
          <Link href="/dashboard" className="md:hidden">
            <KalaricaLogo variant="header" />
          </Link>
          <div className="ml-auto text-sm text-muted-foreground">Operations</div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
