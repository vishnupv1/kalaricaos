import { z } from "zod";

import { LeadStage } from "@/generated/prisma";

function normalizeLeadFormPayload(val: unknown): unknown {
  if (!val || typeof val !== "object") {
    return val;
  }
  const o = val as Record<string, unknown>;
  const str = (key: string) => (o[key] == null ? "" : String(o[key]));
  return {
    fullName: str("fullName"),
    email: str("email"),
    phone: str("phone"),
    source: str("source"),
    stage: o.stage,
    notes: str("notes"),
  };
}

export const leadFormFieldsSchema = z.object({
  fullName: z.string().trim().max(200).transform((s) => (s === "" ? null : s)),
  email: z
    .union([z.literal(""), z.string().email("Invalid email")])
    .transform((s) => (s === "" ? null : s)),
  phone: z.string().trim().max(40).transform((s) => (s === "" ? null : s)),
  source: z.string().trim().max(80).transform((s) => (s === "" ? null : s)),
  stage: z.nativeEnum(LeadStage),
  notes: z.string().trim().max(5000).transform((s) => (s === "" ? null : s)),
});

export const leadFormSchema = z.preprocess(normalizeLeadFormPayload, leadFormFieldsSchema);

export type LeadFormInput = z.input<typeof leadFormFieldsSchema>;
export type LeadFormValues = z.output<typeof leadFormFieldsSchema>;
