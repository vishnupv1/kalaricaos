import { prisma } from "@/lib/prisma";
import { leadNotDeleted } from "@/modules/leads/server/lead-queries";

export async function getMetaLeadStats() {
  const [totalMetaLeads, latestMetaLead] = await Promise.all([
    prisma.lead.count({
      where: {
        AND: [leadNotDeleted, { source: "meta", metaLeadId: { not: null } }],
      },
    }),
    prisma.lead.findFirst({
      where: {
        AND: [leadNotDeleted, { source: "meta", metaLeadId: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        metaLeadId: true,
        createdAt: true,
      },
    }),
  ]);

  return { totalMetaLeads, latestMetaLead };
}
