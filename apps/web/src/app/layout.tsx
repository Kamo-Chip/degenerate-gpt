import type { Metadata } from "next";
import Link from "next/link";

import { Toaster } from "@/components/ui/sonner";
import { UserMenu } from "@/components/user-menu";
import { getUser } from "@/lib/session";
import "./globals.css";

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const description = "Three bots read the game. One bot makes the call.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Degenerate·GPT",
    template: "%s · Degenerate·GPT",
  },
  description,
  openGraph: {
    title: "Degenerate·GPT",
    description,
    siteName: "Degenerate·GPT",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Degenerate·GPT",
    description,
  },
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
                Degenerate<span className="text-primary">·GPT</span>
              </span>
              <span className="hidden text-xs font-bold text-muted-foreground sm:inline">
                FIFA World Cup '26 predictions 🏆
              </span>
            </Link>
            {user && <UserMenu email={user.email} />}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
