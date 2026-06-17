import { getMatch } from "@degenerate-gpt/db";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MatchDetailBody } from "@/components/match-detail-body";
import { MatchDetailSkeleton } from "@/components/match-detail-skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  // getMatch is auth-free; if the match is missing fall back to the layout's
  // default title rather than throwing during metadata generation.
  try {
    const { teamA, teamB } = await getMatch(id);
    const title = `${teamA} vs ${teamB}`;
    const description = `Bot predictions for ${teamA} vs ${teamB} at the FIFA World Cup '26.`;
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { title, description },
    };
  } catch {
    return {};
  }
}

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
