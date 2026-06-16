import { cn } from "@/lib/utils";

/** A 0–1 confidence value rendered as a labeled meter. */
export function ConfidenceBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>confidence</span>
        <span className="font-mono font-medium text-foreground">{pct}%</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-md border-2 border-foreground bg-background">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
