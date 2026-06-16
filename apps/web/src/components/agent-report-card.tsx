import type { AgentReport } from "@degenerate-gpt/shared";

import { ConfidenceBar } from "@/components/confidence-bar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AGENT_LABELS: Record<AgentReport["agent"], string> = {
  stats: "📊 Stats",
  social: "💬 Social",
  market: "📈 Market",
};

export function AgentReportCard({ report }: { report: AgentReport }) {
  const hasRaw = report.raw && Object.keys(report.raw).length > 0;

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="min-w-0 text-base">
            {AGENT_LABELS[report.agent] ?? report.agent}
          </CardTitle>
          <Badge variant="secondary">{report.pick}</Badge>
        </div>
        <ConfidenceBar value={report.confidence} />
      </CardHeader>
      <CardContent className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-sm wrap-break-word text-muted-foreground">{report.summary}</p>

        {report.evidence.length > 0 && (
          <ul className="space-y-1 text-sm">
            {report.evidence.map((item, i) => (
              <li key={i} className="flex min-w-0 gap-2">
                <span className="text-primary">•</span>
                <span className="min-w-0 wrap-break-word">{item}</span>
              </li>
            ))}
          </ul>
        )}

        {hasRaw && (
          <details className="mt-auto min-w-0 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              raw data
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap wrap-break-word">
              {JSON.stringify(report.raw, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
