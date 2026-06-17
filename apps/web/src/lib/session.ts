import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/** The signed-in user, or null. Read in server components / actions. */
export async function getUser() {
  const data = await auth.api.getSession({ headers: await headers() });
  return data?.user ?? null;
}

/**
 * Require a signed-in user, redirecting to /sign-in otherwise. Returns the user
 * so callers get `id`/`email` directly.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}
