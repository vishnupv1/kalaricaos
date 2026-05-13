export type ParsedMetaLeadFields = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  raw: Record<string, string>;
};

type MetaFieldDatum = { name?: string; values?: string[] };

/** Normalize Meta `field_data` name/value pairs into lead columns. */
export function parseMetaLeadFieldData(fieldData: MetaFieldDatum[] | undefined): ParsedMetaLeadFields {
  const raw: Record<string, string> = {};

  for (const field of fieldData ?? []) {
    const name = field.name?.trim().toLowerCase();
    const value = field.values?.[0]?.trim();
    if (!name || !value) continue;
    raw[name] = value;
  }

  const first = raw.first_name ?? raw.firstname ?? null;
  const last = raw.last_name ?? raw.lastname ?? null;
  const combinedName = [first, last].filter(Boolean).join(" ").trim();

  return {
    fullName: raw.full_name ?? raw.name ?? (combinedName || null),
    email: raw.email ?? raw.email_address ?? null,
    phone: raw.phone_number ?? raw.phone ?? raw.mobile_number ?? null,
    raw,
  };
}
