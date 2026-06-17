"use client";

/**
 * Renders a timestamp in the *viewer's* timezone (no fixed `timeZone`, so Intl
 * uses the browser default) with a short tz label. `suppressHydrationWarning`
 * because the server's timezone may differ from the client's — the client value
 * wins after hydration.
 */
export function LocalTime({
  date,
  options,
  fallback = "TBD",
}: {
  date: Date | string | null;
  options: Intl.DateTimeFormatOptions;
  fallback?: string;
}) {
  if (!date) return <span>{fallback}</span>;

  const value = typeof date === "string" ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    ...options
  }).format(value);

  return <span suppressHydrationWarning>{formatted}</span>;
}
