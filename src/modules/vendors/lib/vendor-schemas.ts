import { z } from "zod";

/** RHF + zodResolver submit values use schema *output* (null for cleared optionals). Server actions must accept that shape too. */
function normalizeVendorFormPayload(val: unknown): unknown {
  if (!val || typeof val !== "object") {
    return val;
  }
  const o = val as Record<string, unknown>;
  const str = (key: string) => (o[key] == null ? "" : String(o[key]));
  return {
    name: str("name"),
    email: str("email"),
    phone: str("phone"),
    gstin: str("gstin"),
    address: str("address"),
    notes: str("notes"),
  };
}

/** Plain object schema — use with `zodResolver` in forms (preprocess breaks RHF resolver typings). */
export const vendorFormFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z
    .union([z.literal(""), z.string().email("Invalid email")])
    .transform((s) => (s === "" ? null : s)),
  phone: z.string().trim().max(40).transform((s) => (s === "" ? null : s)),
  gstin: z.string().trim().max(20).transform((s) => (s === "" ? null : s)),
  address: z.string().trim().max(500).transform((s) => (s === "" ? null : s)),
  notes: z.string().trim().max(5000).transform((s) => (s === "" ? null : s)),
});

export const vendorFormSchema = z.preprocess(normalizeVendorFormPayload, vendorFormFieldsSchema);

export type VendorFormInput = z.input<typeof vendorFormFieldsSchema>;
export type VendorFormValues = z.output<typeof vendorFormFieldsSchema>;
