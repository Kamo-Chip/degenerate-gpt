import { ImageResponse } from "next/og";

// Generated favicon — a ⚽ on the brand green, mirroring the header brand mark.
// Next serves this at /icon and injects <link rel="icon"> automatically.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          background: "#3fcf6e",
        }}
      >
        ⚽
      </div>
    ),
    size,
  );
}
