import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/modules/products/components/product-form";
import type { ProductFormInput } from "@/modules/products/lib/product-schemas";
import {
  getProductById,
  listProductCategoriesForSelect,
  listVendorsForProductForm,
} from "@/modules/products/server/product-queries";
import { requireProductsAccess } from "@/modules/products/server/require-products-access";

function toFormInput(product: NonNullable<Awaited<ReturnType<typeof getProductById>>>): ProductFormInput {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description ?? "",
    categoryId: product.categoryId ?? "",
    vendorId: product.vendorId ?? "",
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    stockQuantity: product.stockQuantity,
    reorderThreshold: product.reorderThreshold,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProductsAccess();
  const { id } = await params;
  const [product, categories, vendors] = await Promise.all([
    getProductById(id),
    listProductCategoriesForSelect(),
    listVendorsForProductForm(),
  ]);

  if (!product) {
    notFound();
  }

  const updated = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(product.updatedAt);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link href="/dashboard/products" />}>
            ← Products
          </Button>
          <h1 className="font-heading text-2xl font-semibold">{product.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{product.sku}</p>
          <p className="text-sm text-muted-foreground">Last updated {updated}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">{product._count.images} images</Badge>
            {product.category ? <Badge variant="secondary">{product.category.name}</Badge> : null}
            {product.vendor ? <Badge variant="secondary">{product.vendor.name}</Badge> : null}
          </div>
        </div>
      </div>

      <ProductForm
        mode="edit"
        productId={product.id}
        defaultValues={toFormInput(product)}
        categories={categories}
        vendors={vendors}
      />
    </div>
  );
}
