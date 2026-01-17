"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DisconnectYnabButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ynab/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to disconnect YNAB account");
      }
    } catch {
      setError("Failed to disconnect YNAB account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Disconnect
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect YNAB Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disconnect your YNAB account? You will need
            to reconnect it to use YNAB features with Claude.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDisconnect();
            }}
            disabled={loading}
            className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
          >
            {loading ? "Disconnecting..." : "Disconnect"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
