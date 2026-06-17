import type { ReactElement } from "react";

// Shared building blocks for the generated Open Graph images (next/og). These
// render to a 1200×630 PNG, so only inline styles work — Tailwind is not
// available here. Colours mirror the brutalist brand: black foreground on
// white, with the green primary as the accent.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const GREEN = "#3fcf6e";
const FOREGROUND = "#1a1a1a";

/**
 * The branded card frame shared by every OG image: white field, thick black
 * border, the ⚽ Degenerate·GPT wordmark in the top-left, and whatever `children`
 * the specific route wants to feature in the centre.
 */
export function OgCard({ children }: { children: ReactElement }): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        color: FOREGROUND,
        border: `16px solid ${FOREGROUND}`,
        padding: "56px 64px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 900 }}>
        <span style={{ marginRight: 14 }}>⚽</span>
        <span>Degenerate</span>
        <span style={{ color: GREEN }}>·GPT</span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Default share card body: big wordmark + tagline. */
export function OgDefaultBody(): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 1.05 }}>
        Three bots read the game.
      </div>
      <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 1.05, color: GREEN }}>
        One bot makes the call.
      </div>
    </div>
  );
}

/** Per-match share card body: Team A vs Team B + optional kickoff line. */
export function OgMatchBody({
  teamA,
  teamB,
  kickoff,
}: {
  teamA: string;
  teamB: string;
  kickoff: string | null;
}): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.1 }}>{teamA}</div>
      <div style={{ fontSize: 56, fontWeight: 700, color: "#7a7a7a", margin: "8px 0" }}>vs</div>
      <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.1, color: GREEN }}>{teamB}</div>
      {kickoff ? (
        <div style={{ fontSize: 36, fontWeight: 700, color: "#7a7a7a", marginTop: 28 }}>
          {kickoff}
        </div>
      ) : null}
    </div>
  );
}
