import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VendorRowActions } from "@/modules/vendors/components/vendor-row-actions";
import { listVendors } from "@/modules/vendors/server/vendor-queries";
import { requireVendorsAccess } from "@/modules/vendors/server/require-vendors-access";

function vendorsHref(q: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set("q", q.trim());
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const s = params.toString();
  return s ? `/dashboard/vendors?${s}` : "/dashboard/vendors";
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireVendorsAccess();
  const sp = await searchParams;
  const q = sp.q;
  const rawPage = sp.page ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { items, total, page: currentPage, totalPages } = await listVendors({
    search: q,
    page,
  });

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            {total} vendor{total === 1 ? "" : "s"} · suppliers and service providers
          </p>
        </div>
        <Button render={<Link href="/dashboard/vendors/new" />}>Add vendor</Button>
      </div>

      <form method="get" action="/dashboard/vendors" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="page" value="1" />
        <div className="grid min-w-[200px] flex-1 gap-1.5">
          <label htmlFor="vendor-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input id="vendor-search" name="q" placeholder="Name, email, phone, GSTIN…" defaultValue={q ?? ""} />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q?.trim() ? (
          <Button variant="outline" render={<Link href="/dashboard/vendors" />}>
            Clear
          </Button>
        ) : null}
      </form>

      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Links</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12 text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No vendors match your filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="max-w-[200px] whitespace-normal font-medium">
                    <Link href={`/dashboard/vendors/${v.id}`} className="text-foreground underline-offset-4 hover:underline">
                      {v.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-muted-foreground">
                    {[v.email, v.phone].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{v.gstin ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{v._count.products} products</Badge>
                      <Badge variant="outline">{v._count.expenses} expenses</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{dateFmt.format(v.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <VendorRowActions vendorId={v.id} name={v.name} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            ) : (
              <Button variant="outline" size="sm" render={<Link href={vendorsHref(q, currentPage - 1)} />}>
                Previous
              </Button>
            )}
            {currentPage >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button variant="outline" size="sm" render={<Link href={vendorsHref(q, currentPage + 1)} />}>
                Next
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
