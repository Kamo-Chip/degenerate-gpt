import { MAX_PREDICTIONS, REPO_URL } from "@/lib/limits";

/**
 * Free-tier meter for the dashboard: counts down remaining predictions, then
 * flips to a "clone & self-host" prompt once the cap is hit.
 */
export function UsageBanner({
  used,
  unlimited = false,
}: {
  used: number;
  unlimited?: boolean;
}) {
  if (unlimited) {
    return (
      <div className="rounded-xl border-2 border-success bg-success/10 px-4 py-3 text-sm font-bold shadow-brutal">
        <span aria-hidden className="mr-1">✨</span>
        Unlimited access — analyze as many matches as you like.
      </div>
    );
  }

  const remaining = Math.max(0, MAX_PREDICTIONS - used);

  if (remaining > 0) {
    return (
      <div className="rounded-xl border-2 border-foreground bg-background px-4 py-3 text-sm font-medium shadow-brutal">
        <span aria-hidden className="mr-1">🎟️</span>
        <span className="font-bold">{remaining}</span> of {MAX_PREDICTIONS} free
        predictions left.
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm shadow-brutal">
      <p className="font-bold">🚫 You've used your {MAX_PREDICTIONS} free predictions.</p>
      <p className="mt-1 text-muted-foreground">
        Keep going by running your own instance —{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-foreground underline"
        >
          clone the repo
        </a>{" "}
        and start it with your own API keys.
      </p>
    </div>
  );
}
