import Link from "next/link";

import { Button } from "@/components/ui/button";
import { VendorForm } from "@/modules/vendors/components/vendor-form";
import { requireVendorsAccess } from "@/modules/vendors/server/require-vendors-access";

export default async function NewVendorPage() {
  await requireVendorsAccess();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/vendors" />}>
          ← Vendors
        </Button>
      </div>
      <VendorForm mode="create" />
    </div>
  );
}
