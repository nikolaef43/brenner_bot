import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brenner Bot Lab",
  description:
    "Documents-first Brenner corpus + prompt templating + Agent Mail coordination.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
          <header className="sticky top-0 z-10 border-b border-black/10 bg-zinc-50/80 backdrop-blur dark:border-white/10 dark:bg-black/60">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-semibold tracking-tight">
                Brenner Bot Lab
              </Link>
              <nav className="flex items-center gap-4 text-sm text-zinc-700 dark:text-zinc-300">
                <Link href="/corpus" className="hover:text-zinc-950 dark:hover:text-zinc-50">
                  Corpus
                </Link>
                <Link href="/sessions/new" className="hover:text-zinc-950 dark:hover:text-zinc-50">
                  New Session
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
          <footer className="mx-auto w-full max-w-5xl px-6 py-10 text-xs text-zinc-500 dark:text-zinc-400">
            Built with Next.js + Bun. Coordinated via Agent Mail (MCP).
          </footer>
        </div>
      </body>
    </html>
  );
}
