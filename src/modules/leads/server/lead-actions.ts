"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { leadFormSchema } from "@/modules/leads/lib/lead-schemas";
import { leadNotDeleted } from "@/modules/leads/server/lead-queries";
import { getModuleActionContext } from "@/server/auth/action-context";

export type LeadActionState = { ok: true; id: string } | { ok: false; error: string };

export async function createLeadAction(raw: unknown): Promise<LeadActionState> {
  const ctx = await getModuleActionContext("leads");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      source: data.source,
      stage: data.stage,
      notes: data.notes,
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "manual_create",
      body: "Lead created manually in Kalarica.",
      createdById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/leads");
  return { ok: true, id: lead.id };
}

export async function updateLeadAction(leadId: string, raw: unknown): Promise<LeadActionState> {
  const ctx = await getModuleActionContext("leads");
  if (!ctx) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid data" };
  }

  const existing = await prisma.lead.findFirst({ where: { AND: [{ id: leadId }, leadNotDeleted] } });
  if (!existing) {
    return { ok: false, error: "Lead not found" };
  }

  const data = parsed.data;
  const stageChanged = existing.stage !== data.stage;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      source: data.source,
      stage: data.stage,
      notes: data.notes,
      updatedById: ctx.userId,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: stageChanged ? "stage_change" : "manual_update",
      body: stageChanged ? `Stage changed to ${data.stage}.` : "Lead details updated.",
      metadata: stageChanged ? { from: existing.stage, to: data.stage } : undefined,
      createdById: ctx.userId,
    },
  });

  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);
  return { ok: true, id: leadId };
}
