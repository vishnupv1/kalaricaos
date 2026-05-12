import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProductForm } from "@/modules/products/components/product-form";
import {
  listProductCategoriesForSelect,
  listVendorsForProductForm,
} from "@/modules/products/server/product-queries";
import { requireProductsAccess } from "@/modules/products/server/require-products-access";

export default async function NewProductPage() {
  await requireProductsAccess();
  const [categories, vendors] = await Promise.all([listProductCategoriesForSelect(), listVendorsForProductForm()]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/products" />}>
          ← Products
        </Button>
      </div>
      <ProductForm mode="create" categories={categories} vendors={vendors} />
    </div>
  );
}
