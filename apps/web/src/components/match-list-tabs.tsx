"use client";

import type { MatchListItem } from "@degenerate-gpt/db";
import { useMemo, useState } from "react";

import { MatchList } from "@/components/match-list";
import { cn } from "@/lib/utils";

type Tab = "upcoming" | "finished" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "upcoming", label: "⏳ Upcoming" },
  { key: "finished", label: "🏁 Finished" },
  { key: "all", label: "🌍 All" },
];

/** A match is "finished" once its kickoff has passed; TBD counts as upcoming. */
function isFinished(match: MatchListItem, now: number): boolean {
  return match.kickoffTime != null && match.kickoffTime.getTime() < now;
}

export function MatchListTabs({ matches }: { matches: MatchListItem[] }) {
  const [tab, setTab] = useState<Tab>("upcoming");

  const { groups, counts } = useMemo(() => {
    const now = Date.now();
    const finished = matches.filter((m) => isFinished(m, now));
    const upcoming = matches.filter((m) => !isFinished(m, now));
    return {
      groups: { upcoming, finished, all: matches } as Record<Tab, MatchListItem[]>,
      counts: {
        upcoming: upcoming.length,
        finished: finished.length,
        all: matches.length,
      } as Record<Tab, number>,
    };
  }, [matches]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "rounded-md border-2 border-foreground px-4 py-1.5 text-sm font-bold transition-all",
              tab === key
                ? "translate-x-0.5 translate-y-0.5 bg-primary text-primary-foreground shadow-none"
                : "bg-background text-foreground shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg",
            )}
          >
            {label}{" "}
            <span className="text-xs font-bold opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>

      <MatchList matches={groups[tab]} />
    </div>
  );
}
