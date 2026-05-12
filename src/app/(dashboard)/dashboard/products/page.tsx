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
import { ProductRowActions } from "@/modules/products/components/product-row-actions";
import { listProducts } from "@/modules/products/server/product-queries";
import { requireProductsAccess } from "@/modules/products/server/require-products-access";

function productsHref(q: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set("q", q.trim());
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const s = params.toString();
  return s ? `/dashboard/products?${s}` : "/dashboard/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireProductsAccess();
  const sp = await searchParams;
  const q = sp.q;
  const rawPage = sp.page ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { items, total, page: currentPage, totalPages } = await listProducts({
    search: q,
    page,
  });

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const money = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {total} product{total === 1 ? "" : "s"} · catalog and pricing
          </p>
        </div>
        <Button render={<Link href="/dashboard/products/new" />}>Add product</Button>
      </div>

      <form method="get" action="/dashboard/products" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="page" value="1" />
        <div className="grid min-w-[200px] flex-1 gap-1.5">
          <label htmlFor="product-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input id="product-search" name="q" placeholder="SKU, name, description…" defaultValue={q ?? ""} />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q?.trim() ? (
          <Button variant="outline" render={<Link href="/dashboard/products" />}>
            Clear
          </Button>
        ) : null}
      </form>

      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12 text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No products match your filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    <Link
                      href={`/dashboard/products/${p.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {p.sku}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-muted-foreground">{p.vendor?.name ?? "—"}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{money.format(p.costPrice)}</TableCell>
                  <TableCell className="tabular-nums font-medium">{money.format(p.sellingPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={p.stockQuantity <= 0 ? "destructive" : "secondary"}>{p.stockQuantity}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{dateFmt.format(p.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <ProductRowActions productId={p.id} label={p.sku} />
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
              <Button variant="outline" size="sm" render={<Link href={productsHref(q, currentPage - 1)} />}>
                Previous
              </Button>
            )}
            {currentPage >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button variant="outline" size="sm" render={<Link href={productsHref(q, currentPage + 1)} />}>
                Next
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
