"use client";

import { useTransition } from "react";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/** Signed-in email + sign-out, shown in the header. */
export function UserMenu({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();

  function onSignOut() {
    startTransition(async () => {
      await signOut();
      window.location.href = "/sign-in";
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
        {email}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={onSignOut}
      >
        {isPending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
