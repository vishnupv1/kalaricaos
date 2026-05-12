"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { productFormSchema } from "@/modules/products/lib/product-schemas";
import { productNotDeleted } from "@/modules/products/server/product-queries";
import { getModuleActionContext } from "@/server/auth/action-context";

export type ProductActionState = { ok: true; id: string } | { ok: false; error: string };

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createProductAction(raw: unknown): Promise<ProductActionState> {
  const ctx = await getModuleActionContext("products");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        vendorId: data.vendorId,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        reorderThreshold: data.reorderThreshold,
        createdById: ctx.userId,
        updatedById: ctx.userId,
      },
    });
    revalidatePath("/dashboard/products");
    return { ok: true, id: product.id };
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "That SKU is already in use" };
    }
    throw e;
  }
}

export async function updateProductAction(id: string, raw: unknown): Promise<ProductActionState> {
  const ctx = await getModuleActionContext("products");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await prisma.product.findFirst({ where: { AND: [{ id }, productNotDeleted] } });
  if (!existing) {
    return { ok: false, error: "Product not found" };
  }

  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    await prisma.product.update({
      where: { id },
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        vendorId: data.vendorId,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        reorderThreshold: data.reorderThreshold,
        updatedById: ctx.userId,
      },
    });
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "That SKU is already in use" };
    }
    throw e;
  }
}

export async function softDeleteProductAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getModuleActionContext("products");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await prisma.product.findFirst({ where: { AND: [{ id }, productNotDeleted] } });
  if (!existing) {
    return { ok: false, error: "Product not found" };
  }

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
  return { ok: true };
}
