import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";

const defaultPageSize = 20;

/**
 * Prisma + MongoDB: `deletedAt: null` does not match documents where the field was never written.
 * Include both explicit null and unset so legacy / hand-inserted rows still appear.
 */
export const vendorNotDeleted: Prisma.VendorWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

function buildVendorListWhere(search?: string): Prisma.VendorWhereInput {
  const q = search?.trim();
  if (!q) {
    return vendorNotDeleted;
  }
  return {
    AND: [
      vendorNotDeleted,
      {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { gstin: { contains: q } },
        ],
      },
    ],
  };
}

export async function listVendors(opts: { search?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? defaultPageSize));
  const skip = (page - 1) * pageSize;
  const q = opts.search?.trim();

  const where = buildVendorListWhere(q);

  const [items, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        updatedAt: true,
        _count: { select: { products: true, expenses: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getVendorById(id: string) {
  return prisma.vendor.findFirst({
    where: { AND: [{ id }, vendorNotDeleted] },
    include: {
      _count: { select: { products: true, expenses: true } },
    },
  });
}
