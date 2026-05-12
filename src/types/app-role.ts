import type { AppRole } from "@/generated/prisma";

export type { AppRole };

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  FINANCE_MANAGER: "Finance Manager",
  VENDOR: "Vendor",
  SALES_USER: "Sales",
  INVENTORY_MANAGER: "Inventory Manager",
};
