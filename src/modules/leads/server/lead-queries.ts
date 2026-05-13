import type { LeadStage, Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";

const defaultPageSize = 20;

export const leadNotDeleted: Prisma.LeadWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

function buildLeadListWhere(opts: { search?: string; stage?: LeadStage; source?: string }): Prisma.LeadWhereInput {
  const q = opts.search?.trim();
  const filters: Prisma.LeadWhereInput[] = [leadNotDeleted];

  if (opts.stage) {
    filters.push({ stage: opts.stage });
  }

  const source = opts.source?.trim();
  if (source) {
    filters.push({ source });
  }

  if (q) {
    filters.push({
      OR: [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { notes: { contains: q } },
        { metaLeadId: { contains: q } },
      ],
    });
  }

  return filters.length === 1 ? filters[0]! : { AND: filters };
}

export async function listLeads(opts: {
  search?: string;
  stage?: LeadStage;
  source?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? defaultPageSize));
  const skip = (page - 1) * pageSize;
  const where = buildLeadListWhere(opts);

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        source: true,
        stage: true,
        metaLeadId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

const leadActivityNotDeleted: Prisma.LeadActivityWhereInput = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
};

export async function getLeadById(id: string) {
  return prisma.lead.findFirst({
    where: { AND: [{ id }, leadNotDeleted] },
    include: {
      activities: {
        where: leadActivityNotDeleted,
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          body: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getLeadStageCounts() {
  const stages = await prisma.lead.groupBy({
    by: ["stage"],
    where: leadNotDeleted,
    _count: { _all: true },
  });

  const counts: Record<LeadStage, number> = {
    NEW: 0,
    CONTACTED: 0,
    INTERESTED: 0,
    NEGOTIATION: 0,
    WON: 0,
    LOST: 0,
  };

  for (const row of stages) {
    counts[row.stage] = row._count._all;
  }

  return counts;
}
