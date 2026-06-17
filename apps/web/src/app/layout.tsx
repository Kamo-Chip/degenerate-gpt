import type { Metadata } from "next";
import Link from "next/link";

import { UserMenu } from "@/components/user-menu";
import { getUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "degenerate-gpt",
  description: "Three bots read the game. One bot makes the call.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b-4 border-foreground bg-background">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight">
                <span aria-hidden className="mr-1">⚽</span>
                degenerate<span className="text-primary">·gpt</span>
              </span>
              <span className="hidden text-xs font-bold text-muted-foreground sm:inline">
                FIFA World Cup '26 predictions 🏆
              </span>
            </Link>
            {user && <UserMenu email={user.email} />}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
