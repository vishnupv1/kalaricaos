import type { AppRole } from "@/generated/prisma";

const ROLE_RANK: Record<AppRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  FINANCE_MANAGER: 60,
  INVENTORY_MANAGER: 50,
  SALES_USER: 40,
  VENDOR: 20,
};

export function hasAtLeastRole(userRole: AppRole, minimum: AppRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minimum];
}

export function canAccessModule(userRole: AppRole, module: string): boolean {
  if (userRole === "SUPER_ADMIN") {
    return true;
  }

  const rules: Record<string, AppRole[]> = {
    finance: ["ADMIN", "FINANCE_MANAGER"],
    vendors: ["ADMIN", "FINANCE_MANAGER", "INVENTORY_MANAGER", "SALES_USER"],
    products: ["ADMIN", "INVENTORY_MANAGER", "SALES_USER"],
    inventory: ["ADMIN", "INVENTORY_MANAGER"],
    expenses: ["ADMIN", "FINANCE_MANAGER"],
    leads: ["ADMIN", "SALES_USER"],
    orders: ["ADMIN", "SALES_USER", "FINANCE_MANAGER"],
    meta: ["ADMIN", "FINANCE_MANAGER", "SALES_USER"],
    vendor_portal: ["VENDOR", "ADMIN"],
  };

  const allowed = rules[module];
  if (!allowed) {
    return hasAtLeastRole(userRole, "SALES_USER");
  }

  return allowed.includes(userRole);
}
