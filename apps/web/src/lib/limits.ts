/** Free predictions per user on the hosted instance. After this, self-host. */
export const MAX_PREDICTIONS = 5;

/**
 * Where to point users once they hit the cap (clone + run with their own keys).
 * Override per-deployment with NEXT_PUBLIC_REPO_URL.
 */
export const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ??
  "https://github.com/your-username/degenerate-gpt";
