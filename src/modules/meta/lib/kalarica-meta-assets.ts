/**
 * Kalarica production Meta assets (public identifiers).
 * Override with META_PAGE_ID and META_AD_ACCOUNT_ID in `.env` for another business or staging.
 */
export const KALARICA_META_PAGE_ID = "1107009802496405";

/** Numeric ad account id (no `act_` prefix). */
export const KALARICA_META_AD_ACCOUNT_ID_NUMERIC = "1570113490755042";

/** Marketing API ad account id: always `act_<digits>`. */
export function toActAdAccountId(input: string): string {
  const trimmed = input.trim();
  const body = trimmed.replace(/^act_/i, "");
  if (/^\d+$/.test(body)) {
    return `act_${body}`;
  }
  return trimmed.startsWith("act_") ? trimmed : `act_${body}`;
}
