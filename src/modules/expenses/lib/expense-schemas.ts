import { z } from "zod";

import { ExpenseStatus, PaymentMode } from "@/generated/prisma";

function num(v: unknown, fallback = 0): number {
  if (v == null || v === "") {
    return fallback;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function pickPaymentMode(raw: string): PaymentMode {
  const s = raw.trim();
  return (Object.values(PaymentMode) as string[]).includes(s) ? (s as PaymentMode) : PaymentMode.OTHER;
}

function pickExpenseStatus(raw: string): ExpenseStatus {
  const s = raw.trim();
  return (Object.values(ExpenseStatus) as string[]).includes(s) ? (s as ExpenseStatus) : ExpenseStatus.DRAFT;
}

function normalizeExpenseFormPayload(val: unknown): unknown {
  if (!val || typeof val !== "object") {
    return val;
  }
  const o = val as Record<string, unknown>;
  const str = (key: string) => (o[key] == null ? "" : String(o[key]));
  return {
    title: str("title"),
    amount: num(o["amount"], 0),
    categoryId: str("categoryId"),
    vendorId: str("vendorId"),
    invoiceNumber: str("invoiceNumber"),
    paymentMode: pickPaymentMode(str("paymentMode")),
    expenseDate: normalizeExpenseDateInput(o["expenseDate"]),
    status: pickExpenseStatus(str("status")),
    attachmentUrl: str("attachmentUrl"),
    notes: str("notes"),
  };
}

export function toDateInputValue(d: Date): string {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** RHF submit sends schema *output* (`Date` for expenseDate). Server actions JSON-serialize it to ISO, which is not `YYYY-MM-DD`. */
function normalizeExpenseDateInput(raw: unknown): string {
  if (raw == null || raw === "") {
    return "";
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return toDateInputValue(raw);
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  const isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoPrefix) {
    return isoPrefix[1]!;
  }
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    return toDateInputValue(new Date(parsed));
  }
  return s;
}

export const expenseFormFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  amount: z.number().finite().min(0).max(1e12),
  categoryId: z.string().trim().min(1, "Category is required"),
  vendorId: z.string().trim().transform((s) => (s === "" ? null : s)),
  invoiceNumber: z.string().trim().max(120).transform((s) => (s === "" ? null : s)),
  paymentMode: z.nativeEnum(PaymentMode),
  expenseDate: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
    .transform((s) => new Date(`${s}T12:00:00`)),
  status: z.nativeEnum(ExpenseStatus),
  attachmentUrl: z.string().trim().max(2000).transform((s) => (s === "" ? null : s)),
  notes: z.string().trim().max(10_000).transform((s) => (s === "" ? null : s)),
});

export const expenseFormSchema = z.preprocess(normalizeExpenseFormPayload, expenseFormFieldsSchema);

export type ExpenseFormInput = z.input<typeof expenseFormFieldsSchema>;
export type ExpenseFormValues = z.output<typeof expenseFormFieldsSchema>;
