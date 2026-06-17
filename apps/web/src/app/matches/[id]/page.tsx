import Link from "next/link";
import { Suspense } from "react";

import { MatchDetailBody } from "@/components/match-detail-body";
import { MatchDetailSkeleton } from "@/components/match-detail-skeleton";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <span aria-hidden>⬅️</span>
        All matches
      </Link>

      <Suspense fallback={<MatchDetailSkeleton />}>
        <MatchDetailBody id={id} />
      </Suspense>
    </div>
  );
}
