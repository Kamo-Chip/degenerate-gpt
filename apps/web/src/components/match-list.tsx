import type { MatchListItem } from "@degenerate-gpt/db";
import Link from "next/link";

import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function predictionBadge(status: string) {
  if (status === "complete") {
    return <Badge variant="success">✅ analyzed</Badge>;
  }
  if (status === "running") {
    return <Badge variant="secondary">⏳ analyzing</Badge>;
  }
  return <Badge variant="secondary">⚪ not analyzed</Badge>;
}

export function MatchList({ matches }: { matches: MatchListItem[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No matches yet — fixtures sync automatically each day. Check back soon. ⚽
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Match</TableHead>
          <TableHead>Kickoff</TableHead>
          <TableHead>Prediction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.map((match) => (
          <TableRow key={match.id}>
            <TableCell className="font-medium">
              <Link
                href={`/matches/${match.id}`}
                className="hover:text-primary hover:underline"
              >
                {match.teamA} vs {match.teamB}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              <LocalTime
                date={match.kickoffTime}
                fallback="TBD"
                options={{
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }}
              />
            </TableCell>
            <TableCell>{predictionBadge(match.predictionStatus)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
