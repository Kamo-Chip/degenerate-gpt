import { getMatch } from "@degenerate-gpt/db";
import { ImageResponse } from "next/og";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  OgDefaultBody,
  OgMatchBody,
} from "@/lib/og";

export const alt = "Match prediction · Degenerate·GPT";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function MatchOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getMatch is auth-free, so it works for the unauthenticated crawlers that
  // fetch this image. Fall back to the default branded card if the match is gone.
  let body;
  try {
    const match = await getMatch(id);
    const kickoff = match.kickoffTime
      ? match.kickoffTime.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        })
      : null;
    body = <OgMatchBody teamA={match.teamA} teamB={match.teamB} kickoff={kickoff} />;
  } catch {
    body = <OgDefaultBody />;
  }

  return new ImageResponse(<OgCard>{body}</OgCard>, size);
}
