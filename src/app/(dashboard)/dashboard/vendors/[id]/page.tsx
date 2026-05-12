import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorForm } from "@/modules/vendors/components/vendor-form";
import type { VendorFormInput } from "@/modules/vendors/lib/vendor-schemas";
import { getVendorById } from "@/modules/vendors/server/vendor-queries";
import { requireVendorsAccess } from "@/modules/vendors/server/require-vendors-access";

function toFormInput(vendor: NonNullable<Awaited<ReturnType<typeof getVendorById>>>): VendorFormInput {
  return {
    name: vendor.name,
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    gstin: vendor.gstin ?? "",
    address: vendor.address ?? "",
    notes: vendor.notes ?? "",
  };
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireVendorsAccess();
  const { id } = await params;
  const vendor = await getVendorById(id);
  if (!vendor) {
    notFound();
  }

  const updated = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(vendor.updatedAt);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/dashboard/vendors" />}>
            ← Vendors
          </Button>
          <h1 className="font-heading text-2xl font-semibold">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">Last updated {updated}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{vendor._count.products} products</Badge>
            <Badge variant="outline">{vendor._count.expenses} expenses</Badge>
          </div>
        </div>
      </div>

      <VendorForm mode="edit" vendorId={vendor.id} defaultValues={toFormInput(vendor)} />
    </div>
  );
}
