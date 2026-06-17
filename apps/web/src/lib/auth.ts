import { Pool } from "@neondatabase/serverless";
import { sessions, users, verifications } from "@degenerate-gpt/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resend } from "resend";

/**
 * Better Auth server (magic-link sign-in via Resend). The shared `@degenerate-gpt/db`
 * client uses Neon's HTTP driver, which has no interactive transactions — Better
 * Auth needs them, so auth gets its own Drizzle client on Neon's WebSocket Pool.
 * Same `DATABASE_URL`, same auth tables (re-exported from the db package).
 */
const authDb = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
  schema: { users, sessions, verifications },
});

const FROM = process.env.EMAIL_FROM ?? "degenerate·gpt <onboarding@resend.dev>";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(authDb, {
    provider: "pg",
    // Map Better Auth's model names to our plural tables.
    schema: { user: users, session: sessions, verification: verifications },
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Constructed here (not at module load) so a missing key doesn't throw
        // during `next build`'s page-data collection.
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: "Your DegenerateGPT sign-in link 🤩",
          html: `
            <div style="font-family:system-ui,sans-serif;line-height:1.5">
              <p>Click below to sign in. This link expires shortly and can only be used once.</p>
              <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#14cc61;color:#000;font-weight:700;text-decoration:none;border-radius:8px;box-shadow:3px 3px #000">Sign in</a></p>
            </div>
          `,
        });
      },
    }),
  ],
});
