import { ImageResponse } from "next/og";

import { OG_CONTENT_TYPE, OG_SIZE, OgCard, OgDefaultBody } from "@/lib/og";

export const alt = "Degenerate·GPT — Three bots read the game. One bot makes the call.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard>
        <OgDefaultBody />
      </OgCard>
    ),
    size,
  );
}
