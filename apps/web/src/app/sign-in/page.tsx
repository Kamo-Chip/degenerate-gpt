"use client";

import { useState } from "react";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await signIn.magicLink({ email, callbackURL: "/" });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center">
      <h1 className="text-2xl font-black tracking-tight">
        <span aria-hidden className="mr-1">⚽</span>
        degenerate<span className="text-primary">·gpt</span>
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Sign in to run the bots and track your calls. We'll email you a magic link.
      </p>

      {status === "sent" ? (
        <div className="rounded-xl border-2 border-foreground p-6 text-sm shadow-brutal">
          <p className="font-bold">📬 Check your email</p>
          <p className="mt-1 text-muted-foreground">
            We sent a sign-in link to <span className="font-medium">{email}</span>.
            Open it on this device to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-md border-2 border-foreground bg-background px-3 py-2 text-sm shadow-brutal outline-none focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal-lg"
          />
          <Button type="submit" disabled={status === "sending"} className="w-full">
            {status === "sending" ? "Sending…" : "Send magic link"}
          </Button>
          {status === "error" && (
            <p className="text-sm font-bold text-destructive">
              😬 Couldn't send the link — try again.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
