"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: () => {
          setLoading(false);
        },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-5 text-black font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
