"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createVendorAction, updateVendorAction } from "@/modules/vendors/server/vendor-actions";
import {
  vendorFormFieldsSchema,
  type VendorFormInput,
  type VendorFormValues,
} from "@/modules/vendors/lib/vendor-schemas";

const emptyValues: VendorFormInput = {
  name: "",
  email: "",
  phone: "",
  gstin: "",
  address: "",
  notes: "",
};

type VendorFormProps = {
  mode: "create" | "edit";
  vendorId?: string;
  defaultValues?: VendorFormInput;
};

export function VendorForm({ mode, vendorId, defaultValues }: VendorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<VendorFormInput, unknown, VendorFormValues>({
    resolver: zodResolver(vendorFormFieldsSchema),
    defaultValues: defaultValues ?? emptyValues,
  });

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      if (mode === "create") {
        const res = await createVendorAction(data);
        if (!res.ok) {
          form.setError("root", { message: res.error });
          return;
        }
        router.push(`/dashboard/vendors/${res.id}`);
        router.refresh();
        return;
      }

      if (!vendorId) {
        form.setError("root", { message: "Missing vendor id" });
        return;
      }

      const res = await updateVendorAction(vendorId, data);
      if (!res.ok) {
        form.setError("root", { message: res.error });
        return;
      }
      router.refresh();
    });
  });

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="border-b">
        <CardTitle>{mode === "create" ? "New vendor" : "Edit vendor"}</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4 pt-4">
          {form.formState.errors.root?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="vendor-name">Name</Label>
            <Input id="vendor-name" aria-invalid={!!form.formState.errors.name} {...form.register("name")} />
            {form.formState.errors.name?.message ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vendor-email">Email</Label>
            <Input
              id="vendor-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            {form.formState.errors.email?.message ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vendor-phone">Phone</Label>
            <Input id="vendor-phone" type="tel" aria-invalid={!!form.formState.errors.phone} {...form.register("phone")} />
            {form.formState.errors.phone?.message ? (
              <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vendor-gstin">GSTIN</Label>
            <Input id="vendor-gstin" aria-invalid={!!form.formState.errors.gstin} {...form.register("gstin")} />
            {form.formState.errors.gstin?.message ? (
              <p className="text-xs text-destructive">{form.formState.errors.gstin.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vendor-address">Address</Label>
            <Textarea id="vendor-address" rows={3} aria-invalid={!!form.formState.errors.address} {...form.register("address")} />
            {form.formState.errors.address?.message ? (
              <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vendor-notes">Notes</Label>
            <Textarea id="vendor-notes" rows={4} aria-invalid={!!form.formState.errors.notes} {...form.register("notes")} />
            {form.formState.errors.notes?.message ? (
              <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/vendors")} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
