import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback for the match-detail data region while the analysis loads. */
export function MatchDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* title + kickoff */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* analyze button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* one analysis section: prediction panel + 3 agent cards */}
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-12 rounded-md" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
