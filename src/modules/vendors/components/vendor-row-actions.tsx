"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontalIcon } from "lucide-react";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { softDeleteVendorAction } from "@/modules/vendors/server/vendor-actions";

export function VendorRowActions({ vendorId, name }: { vendorId: string; name: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await softDeleteVendorAction(vendorId);
      setConfirmOpen(false);
      if (res.ok) {
        router.refresh();
      }
    });
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Actions for ${name}`}>
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              router.push(`/dashboard/vendors/${vendorId}`);
            }}
          >
            View / edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              {name} will be hidden from lists. Linked records are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
