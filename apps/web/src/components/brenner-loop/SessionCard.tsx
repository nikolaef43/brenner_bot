"use client";

/**
 * Session Card Component
 *
 * Displays a Brenner Loop session with full info and actions.
 * Used in the session list for browsing and managing sessions.
 *
 * @see brenner_bot-reew.4 (bead)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  sessionStorage,
  exportSession,
  getPhaseName,
  getPhaseSymbol,
  type SessionSummary,
} from "@/lib/brenner-loop";

// ============================================================================
// Types
// ============================================================================

export interface SessionCardProps {
  session: SessionSummary;
  className?: string;
  onContinue?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  onExport?: (sessionId: string, format: "json" | "markdown") => void;
}

// ============================================================================
// Helpers
// ============================================================================

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

function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-success";
  if (confidence >= 40) return "text-warning";
  return "text-destructive";
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case "complete":
      return "bg-success/15 text-success border-success/20";
    case "intake":
      return "bg-muted text-muted-foreground border-border";
    case "sharpening":
    case "level_split":
    case "exclusion_test":
    case "object_transpose":
    case "scale_check":
      return "bg-info/15 text-info border-info/20";
    case "agent_dispatch":
    case "synthesis":
      return "bg-primary/15 text-primary border-primary/20";
    case "evidence_gathering":
    case "revision":
      return "bg-warning/15 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// ============================================================================
// Icons
// ============================================================================

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ArrowDownTrayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

interface DeleteConfirmModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ sessionId, isOpen, onClose, onConfirm }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-fade-in-up">
        <h3 className="text-lg font-semibold text-foreground">Delete Session?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete session <span className="font-mono">{sessionId}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export Menu
// ============================================================================

interface ExportMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: "json" | "markdown") => void;
}

function ExportMenu({ isOpen, onClose, onExport }: ExportMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-border bg-card shadow-lg animate-fade-in-up"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors rounded-t-lg"
        onClick={() => {
          onExport("json");
          onClose();
        }}
      >
        JSON
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors rounded-b-lg"
        onClick={() => {
          onExport("markdown");
          onClose();
        }}
      >
        Markdown
      </button>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SessionCard({
  session,
  className,
  onContinue,
  onDelete,
  onExport,
}: SessionCardProps) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const isComplete = session.phase === "complete";

  const handleContinue = () => {
    if (onContinue) {
      onContinue(session.id);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await sessionStorage.delete(session.id);
      if (onDelete) {
        onDelete(session.id);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleExport = async (format: "json" | "markdown") => {
    setIsExporting(true);
    try {
      const fullSession = await sessionStorage.load(session.id);
      if (!fullSession) {
        console.error("Session not found");
        return;
      }

      // exportSession returns Promise<Blob>
      const blob = await exportSession(fullSession, format);
      const extension = format === "markdown" ? "md" : "json";
      const filename = `${session.id}.${extension}`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport(session.id, format);
      }
    } catch (error) {
      console.error("Failed to export session:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card className={cn("hover:border-primary/30 transition-all", className)}>
        <CardContent className="py-4">
          {/* Header row: ID + timestamp */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="font-mono text-sm font-medium text-foreground truncate">
              {session.id}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(session.updatedAt)}
            </div>
          </div>

          {/* Hypothesis preview */}
          <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {session.hypothesis || "No hypothesis yet"}
          </div>

          {/* Badges row: phase, confidence */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Phase badge with symbol */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                getPhaseColor(session.phase)
              )}
            >
              <span className="opacity-70">{getPhaseSymbol(session.phase)}</span>
              {getPhaseName(session.phase)}
            </span>

            {/* Confidence badge */}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border">
              <span className={cn("font-semibold", getConfidenceColor(session.confidence))}>
                {Math.round(session.confidence)}%
              </span>
              <span className="ml-1 text-muted-foreground">confidence</span>
            </span>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Continue or View Brief */}
            <Button
              size="sm"
              variant={isComplete ? "outline" : "default"}
              onClick={handleContinue}
              className="gap-1.5"
            >
              {isComplete ? (
                <>
                  <DocumentIcon className="size-3.5" />
                  View Brief
                </>
              ) : (
                <>
                  <PlayIcon className="size-3.5" />
                  Continue
                </>
              )}
            </Button>

            {/* Export dropdown */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="gap-1.5"
              >
                <ArrowDownTrayIcon className="size-3.5" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
              <ExportMenu
                isOpen={showExportMenu}
                onClose={() => setShowExportMenu(false)}
                onExport={handleExport}
              />
            </div>

            {/* Delete button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="size-3.5" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        sessionId={session.id}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
