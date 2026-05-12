import { z } from "zod";

function num(v: unknown, fallback = 0): number {
  if (v == null || v === "") {
    return fallback;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/** Align server action payload with form + RHF output (nulls, mixed number types). */
function normalizeProductFormPayload(val: unknown): unknown {
  if (!val || typeof val !== "object") {
    return val;
  }
  const o = val as Record<string, unknown>;
  const str = (key: string) => (o[key] == null ? "" : String(o[key]));
  return {
    sku: str("sku"),
    name: str("name"),
    description: str("description"),
    categoryId: str("categoryId"),
    vendorId: str("vendorId"),
    costPrice: num(o["costPrice"], 0),
    sellingPrice: num(o["sellingPrice"], 0),
    stockQuantity: Math.trunc(num(o["stockQuantity"], 0)),
    reorderThreshold: Math.trunc(num(o["reorderThreshold"], 0)),
  };
}

export const productFormFieldsSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(80),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(20_000).transform((s) => (s === "" ? null : s)),
  categoryId: z.string().trim().transform((s) => (s === "" ? null : s)),
  vendorId: z.string().trim().transform((s) => (s === "" ? null : s)),
  costPrice: z.number().finite().min(0).max(1e12),
  sellingPrice: z.number().finite().min(0).max(1e12),
  stockQuantity: z.number().int().min(0).max(2_000_000_000),
  reorderThreshold: z.number().int().min(0).max(2_000_000_000),
});

export const productFormSchema = z.preprocess(normalizeProductFormPayload, productFormFieldsSchema);

export type ProductFormInput = z.input<typeof productFormFieldsSchema>;
export type ProductFormValues = z.output<typeof productFormFieldsSchema>;
