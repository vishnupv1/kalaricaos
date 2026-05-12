import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

function isPrismaKnownError(e: unknown): e is { code: string; meta?: { message?: unknown } } {
  return typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string";
}

const expenseCategoriesSeed = [
  { slug: "office-supplies", name: "Office supplies", description: "Stationery, consumables, small equipment", sortOrder: 10 },
  { slug: "travel", name: "Travel & conveyance", description: "Transport, fuel, parking, tolls", sortOrder: 20 },
  { slug: "meals", name: "Meals & entertainment", description: "Client meals, team events", sortOrder: 30 },
  { slug: "software", name: "Software & subscriptions", description: "SaaS, licenses, cloud", sortOrder: 40 },
  { slug: "marketing", name: "Marketing & advertising", description: "Ads, creatives, campaigns", sortOrder: 50 },
  { slug: "professional-services", name: "Professional services", description: "Legal, accounting, consulting", sortOrder: 60 },
  { slug: "rent-utilities", name: "Rent & utilities", description: "Rent, electricity, internet", sortOrder: 70 },
  { slug: "inventory-cogs", name: "Inventory / COGS", description: "Cost of goods and stock purchases", sortOrder: 80 },
  { slug: "bank-fees", name: "Bank & payment fees", description: "Charges, FX, payment gateway", sortOrder: 90 },
  { slug: "taxes-licenses", name: "Taxes & licenses", description: "GST, registrations, permits", sortOrder: 100 },
  { slug: "misc", name: "Miscellaneous", description: "Other operating expenses", sortOrder: 110 },
] as const;

async function seedExpenseCategories() {
  for (const row of expenseCategoriesSeed) {
    await prisma.expenseCategory.upsert({
      where: { slug: row.slug },
      create: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sortOrder,
      },
      update: {
        name: row.name,
        description: row.description,
        sortOrder: row.sortOrder,
        deletedAt: null,
      },
    });
  }
  console.info(`Ensured ${expenseCategoriesSeed.length} expense categories (upsert by slug).`);
}

async function main() {
  await seedExpenseCategories();

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@kalarica.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.info(`Seed skipped: user ${email} already exists (categories were still ensured above).`);
    return;
  }

  const userId = randomUUID();
  const hashed = await hashPassword(password);

  await prisma.user.create({
    data: {
      id: userId,
      name: "Super Admin",
      email,
      emailVerified: true,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
    },
  });

  console.info(`Seeded SUPER_ADMIN: ${email}`);
}

main()
  .catch((e: unknown) => {
    if (isPrismaKnownError(e) && e.code === "P2031") {
      console.error(`
Prisma + MongoDB needs a replica set for writes (including seed).

  • npm run db:up   (Docker Mongo with rs0 + initiate)
  • Or Homebrew: mongod --replSet rs0 … then mongosh → rs.initiate()

See .env.example · https://pris.ly/d/mongodb-replica-set
`);
      process.exit(1);
    }
    if (isPrismaKnownError(e) && e.code === "P2010") {
      const msg = String(e.meta?.message ?? "");
      if (msg.includes("replicaSet") && msg.includes("does not match")) {
        console.error(`
MongoDB is running as standalone, but DATABASE_URL has replicaSet=rs0.

Fix one of:
  • Docker: stop Homebrew Mongo on 27017, then: npm run db:up && npm run db:migrate
  • Homebrew: start mongod with --replSet rs0, then rs.initiate() (see .env.example)

Current error: ${msg.slice(0, 200)}…
`);
        process.exit(1);
      }
    }
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
