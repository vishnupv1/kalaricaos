"use server";

import { revalidatePath } from "next/cache";

import { getModuleActionContext } from "@/server/auth/action-context";
import { vendorFormSchema } from "@/modules/vendors/lib/vendor-schemas";
import { vendorNotDeleted } from "@/modules/vendors/server/vendor-queries";
import { prisma } from "@/lib/prisma";

export type VendorActionState = { ok: true; id: string } | { ok: false; error: string };

export async function createVendorAction(raw: unknown): Promise<VendorActionState> {
  const ctx = await getModuleActionContext("vendors");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = vendorFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const data = parsed.data;
  const vendor = await prisma.vendor.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      gstin: data.gstin,
      address: data.address,
      notes: data.notes,
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/vendors");
  return { ok: true, id: vendor.id };
}

export async function updateVendorAction(
  id: string,
  raw: unknown,
): Promise<VendorActionState> {
  const ctx = await getModuleActionContext("vendors");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await prisma.vendor.findFirst({ where: { AND: [{ id }, vendorNotDeleted] } });
  if (!existing) {
    return { ok: false, error: "Vendor not found" };
  }

  const parsed = vendorFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const data = parsed.data;
  await prisma.vendor.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      gstin: data.gstin,
      address: data.address,
      notes: data.notes,
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/vendors");
  revalidatePath(`/dashboard/vendors/${id}`);
  return { ok: true, id };
}

export async function softDeleteVendorAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getModuleActionContext("vendors");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await prisma.vendor.findFirst({ where: { AND: [{ id }, vendorNotDeleted] } });
  if (!existing) {
    return { ok: false, error: "Vendor not found" };
  }

  await prisma.vendor.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/vendors");
  revalidatePath(`/dashboard/vendors/${id}`);
  return { ok: true };
}
