import type { MatchListItem } from "@degenerate-gpt/db";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatKickoff(date: Date | null): string {
  if (!date) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function predictionBadge(status: string) {
  if (status === "complete") {
    return <Badge variant="success">analyzed</Badge>;
  }
  return <Badge variant="secondary">not analyzed</Badge>;
}

export function MatchList({ matches }: { matches: MatchListItem[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No matches yet. Hit <span className="font-medium">Discover matches</span>{" "}
        to pull in World Cup fixtures.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Match</TableHead>
          <TableHead>Kickoff (UTC)</TableHead>
          <TableHead>Status</TableHead>
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
              {formatKickoff(match.kickoffTime)}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{match.status}</Badge>
            </TableCell>
            <TableCell>{predictionBadge(match.predictionStatus)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
