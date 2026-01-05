"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sessionStorage,
  exportSession,
  getPhaseName,
  getPhaseSymbol,
  type Session,
} from "@/lib/brenner-loop";

export interface LocalSessionHubProps {
  sessionId: string;
  className?: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}

function getPrimaryHypothesisPreview(session: Session): string | null {
  const primaryId = session.primaryHypothesisId;
  if (primaryId && session.hypothesisCards[primaryId]?.statement) {
    return session.hypothesisCards[primaryId].statement;
  }

  const first = Object.values(session.hypothesisCards)[0];
  if (first?.statement) return first.statement;

  return null;
}

async function downloadExport(session: Session, format: "json" | "markdown"): Promise<void> {
  const blob = await exportSession(session, format);
  const extension = format === "markdown" ? "md" : "json";
  const filename = `${session.id}.${extension}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function LocalSessionHub({ sessionId, className }: LocalSessionHubProps) {
  const router = useRouter();
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const loaded = await sessionStorage.load(sessionId);
        if (cancelled) return;
        setSession(loaded);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setSession(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const primaryHypothesis = session ? getPrimaryHypothesisPreview(session) : null;

  const handleExport = async (format: "json" | "markdown") => {
    if (!session) return;
    setIsExporting(true);
    try {
      await downloadExport(session, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export session.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this local session from your browser storage?")) return;

    setIsDeleting(true);
    try {
      await sessionStorage.delete(sessionId);
      router.push("/sessions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("max-w-5xl mx-auto space-y-6", className)}>
        <div className="rounded-2xl border border-border bg-card p-8 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={cn("max-w-3xl mx-auto space-y-6", className)}>
        <div className="rounded-2xl border border-border bg-card p-8 space-y-3">
          <h1 className="text-xl font-semibold text-foreground">Local Session</h1>
          <div className="text-sm text-muted-foreground font-mono break-words">{sessionId}</div>
          <p className="text-sm text-muted-foreground">
            This session isn’t available in your browser storage.
          </p>
          {error && <p className="text-sm text-warning break-words">{error}</p>}
          <div className="pt-2">
            <Link href="/sessions" className="text-sm text-primary hover:underline">
              ← Back to Sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-5xl mx-auto space-y-8", className)}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Local Session</h1>
            <div className="mt-1 text-sm text-muted-foreground font-mono break-words">{session.id}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExport("json")}
              disabled={isExporting}
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExport("markdown")}
              disabled={isExporting}
            >
              Export Markdown
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">Phase:</span>{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <span className="opacity-70">{getPhaseSymbol(session.phase)}</span>
            {getPhaseName(session.phase)}
          </span>
          <span className="mx-2">·</span>
          <span className="font-medium text-foreground/80">Updated:</span>{" "}
          {formatRelativeTime(session.updatedAt)}
        </div>

        {error && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-warning break-words">
            {error}
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hypothesis</CardTitle>
          <CardDescription>
            {primaryHypothesis ? "Primary hypothesis statement" : "No hypothesis captured yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-foreground leading-relaxed">
            {primaryHypothesis ?? "Add one in the Hypothesis page."}
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href={`/sessions/${session.id}/hypothesis`} className="block">
          <Card className="h-full hover:border-primary/30 hover:bg-muted/20 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Hypothesis</CardTitle>
              <CardDescription>Refine the core hypothesis</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/sessions/${session.id}/operators`} className="block">
          <Card className="h-full hover:border-primary/30 hover:bg-muted/20 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Operators</CardTitle>
              <CardDescription>Apply Σ ⊘ ⟳ ⊙</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/sessions/${session.id}/test-queue`} className="block">
          <Card className="h-full hover:border-primary/30 hover:bg-muted/20 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Test Queue</CardTitle>
              <CardDescription>Plan discriminative tests</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/sessions/${session.id}/brief`} className="block">
          <Card className="h-full hover:border-primary/30 hover:bg-muted/20 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Brief</CardTitle>
              <CardDescription>Review artifacts</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </section>

      <div className="pt-2">
        <Link href="/sessions" className="text-sm text-primary hover:underline">
          ← Back to Sessions
        </Link>
      </div>
    </div>
  );
}

