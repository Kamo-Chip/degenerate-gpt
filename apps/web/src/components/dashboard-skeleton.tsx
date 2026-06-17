import { Skeleton } from "@/components/ui/skeleton";

/** Fallback for the dashboard's data region while matches + usage load. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* usage banner */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* tab pills */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* match rows */}
      <div className="space-y-3 rounded-md border-2 border-foreground p-4 shadow-brutal">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
