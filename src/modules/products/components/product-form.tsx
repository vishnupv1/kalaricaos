"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProductAction, updateProductAction } from "@/modules/products/server/product-actions";
import {
  productFormFieldsSchema,
  type ProductFormInput,
  type ProductFormValues,
} from "@/modules/products/lib/product-schemas";
import { cn } from "@/lib/utils";

const emptyValues: ProductFormInput = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  vendorId: "",
  costPrice: 0,
  sellingPrice: 0,
  stockQuantity: 0,
  reorderThreshold: 0,
};

const selectClass = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

type Option = { id: string; name: string };

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  defaultValues?: ProductFormInput;
  categories: Option[];
  vendors: Option[];
};

export function ProductForm({ mode, productId, defaultValues, categories, vendors }: ProductFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormFieldsSchema),
    defaultValues: defaultValues ?? emptyValues,
  });

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      if (mode === "create") {
        const res = await createProductAction(data);
        if (!res.ok) {
          form.setError("root", { message: res.error });
          return;
        }
        router.push(`/dashboard/products/${res.id}`);
        router.refresh();
        return;
      }

      if (!productId) {
        form.setError("root", { message: "Missing product id" });
        return;
      }

      const res = await updateProductAction(productId, data);
      if (!res.ok) {
        form.setError("root", { message: res.error });
        return;
      }
      router.refresh();
    });
  });

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="border-b">
        <CardTitle>{mode === "create" ? "New product" : "Edit product"}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4 pt-4">
          {form.formState.errors.root?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="product-sku">SKU</Label>
              <Input id="product-sku" autoComplete="off" aria-invalid={!!form.formState.errors.sku} {...form.register("sku")} />
              {form.formState.errors.sku?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="product-name">Name</Label>
              <Input id="product-name" aria-invalid={!!form.formState.errors.name} {...form.register("name")} />
              {form.formState.errors.name?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                rows={4}
                aria-invalid={!!form.formState.errors.description}
                {...form.register("description")}
              />
              {form.formState.errors.description?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-category">Category</Label>
              <select id="product-category" className={selectClass} aria-invalid={!!form.formState.errors.categoryId} {...form.register("categoryId")}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-vendor">Vendor</Label>
              <select id="product-vendor" className={selectClass} aria-invalid={!!form.formState.errors.vendorId} {...form.register("vendorId")}>
                <option value="">None</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-cost">Cost price</Label>
              <Input
                id="product-cost"
                type="number"
                min={0}
                step="0.01"
                aria-invalid={!!form.formState.errors.costPrice}
                {...form.register("costPrice", { valueAsNumber: true })}
              />
              {form.formState.errors.costPrice?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.costPrice.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-sell">Selling price</Label>
              <Input
                id="product-sell"
                type="number"
                min={0}
                step="0.01"
                aria-invalid={!!form.formState.errors.sellingPrice}
                {...form.register("sellingPrice", { valueAsNumber: true })}
              />
              {form.formState.errors.sellingPrice?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.sellingPrice.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-stock">Stock quantity</Label>
              <Input
                id="product-stock"
                type="number"
                min={0}
                step="1"
                aria-invalid={!!form.formState.errors.stockQuantity}
                {...form.register("stockQuantity", { valueAsNumber: true })}
              />
              {form.formState.errors.stockQuantity?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.stockQuantity.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-reorder">Reorder threshold</Label>
              <Input
                id="product-reorder"
                type="number"
                min={0}
                step="1"
                aria-invalid={!!form.formState.errors.reorderThreshold}
                {...form.register("reorderThreshold", { valueAsNumber: true })}
              />
              {form.formState.errors.reorderThreshold?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.reorderThreshold.message}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/products")} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
