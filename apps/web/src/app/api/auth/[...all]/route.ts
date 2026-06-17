import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Better Auth's catch-all handler: sign-in, magic-link verification, session, etc.
export const { GET, POST } = toNextJsHandler(auth);
