import { Suspense } from "react";

import { DashboardBody } from "@/components/dashboard-body";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
        <p className="text-sm text-muted-foreground">
          Run the bots on upcoming fixtures and see who they back.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}
