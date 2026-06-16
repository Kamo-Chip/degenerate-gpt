import { listMatches } from "@degenerate-gpt/db";
import { Sparkles } from "lucide-react";

import { discoverMatchesAction } from "@/app/actions";
import { MatchList } from "@/components/match-list";
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
          <Sparkles />
          Discover matches
        </TriggerButton>
      </div>

      <MatchList matches={matches} />
    </div>
  );
}
