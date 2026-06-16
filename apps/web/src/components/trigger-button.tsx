"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/**
 * A button that fires a server action and shows a pending spinner. The action
 * returns an optional run id, surfaced briefly as confirmation.
 */
export function TriggerButton({
  action,
  children,
  pendingLabel = "Working…",
  variant = "default",
  size = "default",
}: {
  action: () => Promise<{ runId: string } | void>;
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending} variant={variant} size={size}>
      {isPending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
