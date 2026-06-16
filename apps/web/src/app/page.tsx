import { listMatches } from "@degenerate-gpt/db";

import { discoverMatchesAction } from "@/app/actions";
import { MatchListTabs } from "@/components/match-list-tabs";
import { TriggerButton } from "@/components/trigger-button";

// Always read fresh from the DB — matches/predictions change out of band.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const matches = await listMatches();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground">
            Discover fixtures, run the bots, see who they back.
          </p>
        </div>
        <TriggerButton
          action={discoverMatchesAction}
          pendingLabel="Discovering…"
        >
          <span aria-hidden>🔍</span>
          Discover matches
        </TriggerButton>
      </div>

      <MatchListTabs matches={matches} />
    </div>
  );
}
