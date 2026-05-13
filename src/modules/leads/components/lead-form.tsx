"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { LeadStage } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLeadAction, updateLeadAction } from "@/modules/leads/server/lead-actions";
import {
  leadFormFieldsSchema,
  type LeadFormInput,
  type LeadFormValues,
} from "@/modules/leads/lib/lead-schemas";
import { cn } from "@/lib/utils";

function buildDefaultLeadValues(): LeadFormInput {
  return {
    fullName: "",
    email: "",
    phone: "",
    source: "",
    stage: LeadStage.NEW,
    notes: "",
  };
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

const selectClass = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

type LeadFormProps = {
  mode: "create" | "edit";
  leadId?: string;
  defaultValues?: LeadFormInput;
  metaLeadId?: string | null;
};

export function LeadForm({ mode, leadId, defaultValues, metaLeadId }: LeadFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<LeadFormInput, unknown, LeadFormValues>({
    resolver: zodResolver(leadFormFieldsSchema),
    defaultValues: defaultValues ?? buildDefaultLeadValues(),
  });

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      if (mode === "create") {
        const res = await createLeadAction(data);
        if (!res.ok) {
          form.setError("root", { message: res.error });
          return;
        }
        router.push(`/dashboard/leads/${res.id}`);
        router.refresh();
        return;
      }

      if (!leadId) return;
      const res = await updateLeadAction(leadId, data);
      if (!res.ok) {
        form.setError("root", { message: res.error });
        return;
      }
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "New lead" : "Lead details"}</CardTitle>
          {metaLeadId ? (
            <p className="text-xs text-muted-foreground">
              Meta lead id <code className="rounded bg-muted px-1 font-mono">{metaLeadId}</code>
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <MotionlessLeadField label="Full name" error={form.formState.errors.fullName?.message}>
            <Input {...form.register("fullName")} autoComplete="name" />
          </MotionlessLeadField>
          <MotionlessLeadField label="Email" error={form.formState.errors.email?.message}>
            <Input {...form.register("email")} type="email" autoComplete="email" />
          </MotionlessLeadField>
          <MotionlessLeadField label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} type="tel" autoComplete="tel" />
          </MotionlessLeadField>
          <MotionlessLeadField label="Source" error={form.formState.errors.source?.message}>
            <Input {...form.register("source")} placeholder="meta, referral, walk-in…" />
          </MotionlessLeadField>
          <MotionlessLeadField label="Stage" error={form.formState.errors.stage?.message}>
            <select {...form.register("stage")} className={selectClass}>
              {Object.values(LeadStage).map((stage) => (
                <option key={stage} value={stage}>
                  {formatEnumLabel(stage)}
                </option>
              ))}
            </select>
          </MotionlessLeadField>
          <MotionlessLeadField label="Notes" error={form.formState.errors.notes?.message} className="sm:col-span-2">
            <Textarea {...form.register("notes")} rows={4} />
          </MotionlessLeadField>
          {form.formState.errors.root ? (
            <p className="text-sm text-destructive sm:col-span-2">{form.formState.errors.root.message}</p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create lead" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function MotionlessLeadField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
