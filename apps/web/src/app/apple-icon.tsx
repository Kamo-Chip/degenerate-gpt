import { ImageResponse } from "next/og";

// Larger ⚽ mark for iOS home-screen / share surfaces. Served at /apple-icon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          background: "#3fcf6e",
        }}
      >
        ⚽
      </div>
    ),
    size,
  );
}
