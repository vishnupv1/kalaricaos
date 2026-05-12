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
import { softDeleteExpenseAction } from "@/modules/expenses/server/expense-actions";

export function ExpenseRowActions({ expenseId, label }: { expenseId: string; label: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await softDeleteExpenseAction(expenseId);
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
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Actions for ${label}`}>
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              router.push(`/dashboard/expenses/${expenseId}`);
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
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {label} will be hidden from reports and lists. This does not reverse any payments already made outside
              the system.
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
