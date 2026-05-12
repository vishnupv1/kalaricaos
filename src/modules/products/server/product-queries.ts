import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { vendorNotDeleted } from "@/modules/vendors/server/vendor-queries";

const defaultPageSize = 20;

export const productNotDeleted: Prisma.ProductWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export const productCategoryNotDeleted: Prisma.ProductCategoryWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

function buildProductListWhere(search?: string): Prisma.ProductWhereInput {
  const q = search?.trim();
  if (!q) {
    return productNotDeleted;
  }
  return {
    AND: [
      productNotDeleted,
      {
        OR: [
          { sku: { contains: q } },
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
    ],
  };
}

export async function listProducts(opts: { search?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? defaultPageSize));
  const skip = (page - 1) * pageSize;
  const q = opts.search?.trim();
  const where = buildProductListWhere(q);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        name: true,
        costPrice: true,
        sellingPrice: true,
        stockQuantity: true,
        updatedAt: true,
        category: { select: { name: true } },
        vendor: { select: { name: true } },
        _count: { select: { images: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductById(id: string) {
  return prisma.product.findFirst({
    where: { AND: [{ id }, productNotDeleted] },
    include: {
      category: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
      _count: { select: { images: true } },
    },
  });
}

export async function listProductCategoriesForSelect() {
  return prisma.productCategory.findMany({
    where: productCategoryNotDeleted,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listVendorsForProductForm() {
  return prisma.vendor.findMany({
    where: vendorNotDeleted,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
