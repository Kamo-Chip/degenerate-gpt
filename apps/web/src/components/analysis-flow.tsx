"use client";

import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "running" | "done" | "failed";

/** Green marching dashes over transparent gaps — the "flow" travelling a line. */
const FLOW_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, var(--color-primary) 0 6px, transparent 6px 12px)",
  backgroundSize: "12px 100%",
};

type LineState = "idle" | "flow" | "done";

function HLine({ state }: { state: LineState }) {
  if (state === "flow") {
    return <div className="h-1 w-full animate-flow" style={FLOW_STYLE} />;
  }
  return (
    <div className={cn("h-1 w-full", state === "done" ? "bg-success" : "bg-foreground")} />
  );
}

function statusBadge(status: StepStatus) {
  switch (status) {
    case "done":
      return "✅";
    case "failed":
      return "❌";
    case "running":
      return <span className="inline-block animate-spin">⚽</span>;
    default:
      return "⚪";
  }
}

function Node({
  emoji,
  label,
  status,
  className,
}: {
  emoji: string;
  label: string;
  status: StepStatus;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-16 w-40 shrink-0 flex-col justify-center gap-0.5 rounded-md border-2 border-foreground px-3 shadow-brutal transition-colors",
        status === "done" && "bg-success",
        status === "failed" && "bg-destructive text-white",
        status === "running" && "animate-pulse bg-background",
        status === "pending" && "bg-background opacity-50",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span aria-hidden className="text-lg">
          {emoji}
        </span>
        <span className="text-sm">{statusBadge(status)}</span>
      </div>
      <span className="truncate text-xs font-bold">{label}</span>
    </div>
  );
}

/**
 * Renders the analysis as a left→right DAG that mirrors the real architecture:
 * Match feeds three parallel source agents, which converge into the Decider,
 * which produces the final Call. Nodes turn solid green as each agent finishes
 * and the connectors "flow" green to show progress travelling through the graph.
 */
export function AnalysisFlow({
  steps,
  hasRun,
}: {
  steps: Record<string, StepStatus>;
  hasRun: boolean;
}) {
  const matchStatus: StepStatus = hasRun ? "done" : "pending";
  const sourceStatus = (key: string): StepStatus =>
    steps[key] ?? (hasRun ? "running" : "pending");
  const stats = sourceStatus("stats");
  const social = sourceStatus("social");
  const market = sourceStatus("market");
  const decide: StepStatus = steps.decide ?? "pending";
  const callStatus: StepStatus = decide === "done" ? "done" : "pending";

  const sources = [
    { key: "stats", emoji: "📊", label: "Stats", status: stats },
    { key: "social", emoji: "💬", label: "Social", status: social },
    { key: "market", emoji: "📈", label: "Market", status: market },
  ];
  const allSourcesDone = sources.every((s) => s.status === "done");
  const deciderRunning = decide === "running";

  // Fan-out arm: flows while the match is in and that agent is still working;
  // turns solid green once the agent is done.
  const fanArm = (status: StepStatus): LineState =>
    status === "done" ? "done" : hasRun ? "flow" : "idle";
  // Converge arm: green once the agent is done, flowing on into the decider.
  const convergeArm = (status: StepStatus): LineState =>
    status === "done" ? (deciderRunning ? "flow" : "done") : "idle";
  const finalLine: LineState =
    decide === "done" ? "done" : deciderRunning ? "flow" : "idle";

  const spine = (active: boolean) =>
    cn("w-1", active ? "bg-success" : "bg-foreground");

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-foreground bg-card p-4 shadow-brutal">
      <div className="flex min-w-max items-center gap-2 justify-center">
        {/* Match */}
        <Node emoji="⚽" label="Match" status={matchStatus} className="w-28" />

        {/* Fan-out 1 → 3 */}
        <div className="relative flex w-10 flex-col gap-3 self-stretch">
          <div className={cn("absolute left-0 top-8 bottom-8", spine(hasRun))} />
          {sources.map((s) => (
            <div key={s.key} className="flex h-16 items-center">
              <HLine state={fanArm(s.status)} />
            </div>
          ))}
        </div>

        {/* Parallel source agents */}
        <div className="flex flex-col gap-3">
          {sources.map((s) => (
            <Node key={s.key} emoji={s.emoji} label={s.label} status={s.status} />
          ))}
        </div>

        {/* Converge 3 → 1 */}
        <div className="relative flex w-10 flex-col gap-3 self-stretch">
          <div
            className={cn("absolute right-0 top-8 bottom-8", spine(allSourcesDone))}
          />
          {sources.map((s) => (
            <div key={s.key} className="flex h-16 items-center">
              <HLine state={convergeArm(s.status)} />
            </div>
          ))}
        </div>

        {/* Decider */}
        <Node emoji="🤖" label="Decider" status={decide} className="w-32" />

        {/* Decider → Call */}
        <div className="w-10">
          <HLine state={finalLine} />
        </div>

        {/* Final call */}
        <Node emoji="🏆" label="The call" status={callStatus} className="w-28" />
      </div>
    </div>
  );
}
