import { getUserUsage, listMatches } from "@degenerate-gpt/db";

import { MatchListTabs } from "@/components/match-list-tabs";
import { UsageBanner } from "@/components/usage-banner";
import { requireUser } from "@/lib/session";

/**
 * Async server component holding the dashboard's data fetches. Rendered inside a
 * <Suspense> boundary so the page shell flushes immediately while matches + usage
 * stream in. Reading cookies in requireUser keeps the route dynamic (always fresh).
 */
export async function DashboardBody() {
  const user = await requireUser();
  const [matches, usage] = await Promise.all([
    listMatches(user.id),
    getUserUsage(user.id),
  ]);

  return (
    <div className="space-y-4">
      <UsageBanner used={usage.used} unlimited={usage.unlimited} />
      <MatchListTabs matches={matches} />
    </div>
  );
}
