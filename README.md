# degenerate-gpt — World Cup match prediction bot

A "bot" that, for a single match, spins up three specialized source agents and a
final decider:

> One bot reads the numbers. One bot reads the internet. One bot reads the money.
> Then the final gambling bot decides who to back (paper trading only).

The core flow, end-to-end:

```
discover-matches (real fixtures) → analyze-match → stats/social/market agents (parallel)
→ reports saved → decider produces prediction → prediction saved
```

All three source agents now run on **real data**:

- **Stats** ("reads the numbers") — football-data.org standings/form + eloratings.net
  Elo, combined into a strength signal (no LLM).
- **Social** ("reads the internet") — an agentic deep-research agent: an LLM tool-loop
  over web + news search.
- **Market** ("reads the money") — an agentic deep-research agent: an LLM tool-loop over
  Polymarket implied probabilities + web + news search. **Read-only signal only.**

The **Decider** is real too — it calls OpenAI via the Vercel AI SDK. **No real bets are
ever placed — paper trading only.**

## Layout

```
packages/
  shared/   @degenerate-gpt/shared   Zod schemas, shared types, constants
  sources/  @degenerate-gpt/sources  data-source clients (football-data, elo, polymarket, tavily)
  db/       @degenerate-gpt/db       Drizzle schema + Neon client + queries + seed
  agents/   @degenerate-gpt/agents   agent logic (stats compute; social/market = LLM research; decider real)
apps/
  jobs/     @degenerate-gpt/jobs     Trigger.dev tasks (thin wrappers over @degenerate-gpt/agents)
  web/      @degenerate-gpt/web      Next.js dashboard (browse matches/reports, trigger runs, grade picks)
```

`apps/api` (Railway) comes in a later milestone.

## Setup

1. `pnpm install`
2. `cp .env.example .env` and fill in:
   - `DATABASE_URL` — Neon Postgres connection string
   - `OPENAI_API_KEY` — Decider + Social/Market research (optional `OPENAI_MODEL`, default `gpt-5.5-2026-04-23`)
   - `FOOTBALL_DATA_API_KEY` — free key from football-data.org (Stats + discovery)
   - `TAVILY_API_KEY` — web + news search for the Social/Market research agents
   - `TRIGGER_SECRET_KEY` — needed by `apps/web` to trigger runs (and to deploy `apps/jobs`)
   - (Polymarket needs no key.)
3. Connect Trigger.dev: `npx trigger.dev@latest init` (sets the project ref) or
   put your project ref in `apps/jobs/trigger.config.ts` / `TRIGGER_PROJECT_REF`.

## Run the milestone

```bash
pnpm db:push           # create / update the tables on Neon
pnpm dev:jobs          # start the Trigger.dev dev server (run `trigger.dev login` if prompted)
```

Then in the Trigger.dev dashboard:

1. **Test** `discover-matches` (payload `{}` or `{ "competition": "WC" }`) to ingest real
   World Cup fixtures. Copy a `matchId` from the run output.
2. **Test** `analyze-match` with that id:

   ```json
   { "matchId": "<matchId from discover-matches>" }
   ```

Verify:
- the run tree shows `stats-agent`, `social-agent`, `market-agent` running in
  parallel, then `decider-agent`;
- in the `social-agent` / `market-agent` logs, the **multi-step tool loop** fired
  (Tavily / Polymarket tool calls), not a single fetch;
- `agent_reports` has 3 rows carrying **real** figures and `predictions` has 1 row.

> `pnpm db:seed` still exists as an offline fallback that inserts hand-made matches
> (no real `externalId`/team ids), but `discover-matches` is the real path.

For a quick human-readable check:

```bash
pnpm db:report <matchId>
```

## Dashboard (`apps/web`)

A Next.js dashboard to drive the bot without the Trigger.dev UI. It reads Neon
directly from server components and fires runs via the Trigger.dev SDK (needs
`TRIGGER_SECRET_KEY` and `DATABASE_URL`, both read from the repo-root `.env`).

```bash
pnpm db:push           # creates the auth + analyses tables and the userId columns
pnpm dev:web           # http://localhost:3000
```

> **Heads up — `db:push` and existing data:** `agent_reports` / `predictions` gain a
> NOT NULL `user_id`. If you already have rows from before accounts existed, truncate
> them first (`TRUNCATE agent_reports, predictions;`) — they're regenerable by re-running
> an analysis.

### Accounts & limits

The hosted app has **user accounts** (magic-link sign-in via [Better Auth](https://better-auth.com)
+ [Resend](https://resend.com)). Match fixtures are **shared**, but each user's analyses
(agent reports, predictions, 👍/👎 verdicts) are **private** to them.

Set these in the repo-root `.env`: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`RESEND_API_KEY`, `EMAIL_FROM` (and optionally `NEXT_PUBLIC_REPO_URL`).

Every prediction on the hosted instance runs on the **operator's** API keys
(`OPENAI_API_KEY` / `FOOTBALL_DATA_API_KEY` / `TAVILY_API_KEY`), so each account is
capped at **5 predictions**. After that, the UI prompts you to **clone this repo and run
your own instance** with your own keys (the Setup section above) — no limit when you host
it yourself.

- **/** — lists matches with status + whether they've been analyzed; **Discover
  matches** triggers `discover-matches`.
- **/matches/[id]** — the three agent reports (pick / confidence / summary /
  evidence / raw) and the Decider's final call (pick / confidence / rationale /
  disagreement). **Analyze match** triggers `analyze-match`. Grade the call with a
  👍 / 👎 (stored on the prediction; click again to clear).

It's a prediction/analysis viewer only — no money, stakes, or betting shown.

## Out of scope (later)

Scheduling `discover-matches` on a cron (`check-upcoming-matches`),
`fetch-match-result` + `match_results`, auto-grading verdicts from real results,
and the Railway API (`apps/api`).
