"use client";

/**
 * Session List with Sorting, Filtering & Import
 *
 * Lists locally stored Brenner Loop sessions with:
 * - Sorting by date, confidence, phase
 * - Filtering by status (active/complete)
 * - Import support (file picker + drag-and-drop)
 *
 * @see brenner_bot-1v26.4 (bead)
 * @see brenner_bot-reew.4 (bead) - Enhanced session management
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  sessionStorage,
  importSession,
  type SessionSummary,
} from "@/lib/brenner-loop";
import { SessionCard } from "./SessionCard";

// ============================================================================
// Types
// ============================================================================

export interface SessionListProps {
  className?: string;
  onSelect?: (sessionId: string) => void;
}

type SortField = "date" | "confidence" | "phase";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "complete";

// ============================================================================
// Icons
// ============================================================================

function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}


// ============================================================================
// Sorting & Filtering
// ============================================================================

const PHASE_ORDER: Record<string, number> = {
  intake: 0,
  sharpening: 1,
  level_split: 2,
  exclusion_test: 3,
  object_transpose: 4,
  scale_check: 5,
  agent_dispatch: 6,
  synthesis: 7,
  evidence_gathering: 8,
  revision: 9,
  complete: 10,
};

function sortSessions(
  sessions: SessionSummary[],
  field: SortField,
  direction: SortDirection
): SessionSummary[] {
  const sorted = [...sessions].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "date":
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;
      case "confidence":
        comparison = b.confidence - a.confidence;
        break;
      case "phase":
        // Higher phase number = more progressed, should come first in "desc"
        comparison = (PHASE_ORDER[b.phase] ?? 0) - (PHASE_ORDER[a.phase] ?? 0);
        break;
    }

    return direction === "desc" ? comparison : -comparison;
  });

  return sorted;
}

function filterSessions(
  sessions: SessionSummary[],
  statusFilter: StatusFilter
): SessionSummary[] {
  if (statusFilter === "all") return sessions;

  return sessions.filter((s) => {
    if (statusFilter === "complete") return s.phase === "complete";
    return s.phase !== "complete";
  });
}

// ============================================================================
// Sort Button Component
// ============================================================================

interface SortButtonProps {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onClick: (field: SortField) => void;
}

function SortButton({ label, field, currentField, direction, onClick }: SortButtonProps) {
  const isActive = currentField === field;

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
        isActive
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
      )}
    >
      {label}
      {isActive ? (
        direction === "desc" ? (
          <ChevronDownIcon className="size-3" />
        ) : (
          <ChevronUpIcon className="size-3" />
        )
      ) : (
        <ChevronUpDownIcon className="size-3 opacity-50" />
      )}
    </button>
  );
}

// ============================================================================
// Filter Pills Component
// ============================================================================

interface FilterPillsProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: { all: number; active: number; complete: number };
}

function FilterPills({ value, onChange, counts }: FilterPillsProps) {
  const options: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "active", label: "Active", count: counts.active },
    { value: "complete", label: "Complete", count: counts.complete },
  ];

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-semibold",
              value === option.value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {option.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SessionList({ className, onSelect }: SessionListProps) {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<SessionSummary[]>([]);
  const [importWarnings, setImportWarnings] = React.useState<string[]>([]);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sorting & filtering state
  const [sortField, setSortField] = React.useState<SortField>("date");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const refreshSessions = React.useCallback(async () => {
    const list = await sessionStorage.list();
    setSessions(list);
  }, []);

  React.useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const handleImport = React.useCallback(async (file: File) => {
    setImportError(null);
    setImportWarnings([]);

    try {
      const { session, warnings } = await importSession(file);
      await sessionStorage.save(session);
      setImportWarnings(warnings);
      await refreshSessions();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Failed to import session.");
    }
  }, [refreshSessions]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleImport(file);
      event.target.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleImport(file);
    }
  };

  const handleSortClick = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleContinue = (sessionId: string) => {
    if (onSelect) {
      onSelect(sessionId);
    } else {
      router.push(`/sessions/${sessionId}`);
    }
  };

  const handleDelete = () => {
    void refreshSessions();
  };

  // Calculate counts for filter pills
  const counts = React.useMemo(() => {
    const complete = sessions.filter((s) => s.phase === "complete").length;
    return {
      all: sessions.length,
      active: sessions.length - complete,
      complete,
    };
  }, [sessions]);

  // Apply filter and sort
  const displayedSessions = React.useMemo(() => {
    const filtered = filterSessions(sessions, statusFilter);
    return sortSessions(filtered, sortField, sortDirection);
  }, [sessions, statusFilter, sortField, sortDirection]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Import zone */}
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border bg-muted/20 p-6 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "hover:border-primary/40"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Import Session</h3>
            <p className="text-xs text-muted-foreground">
              Drag a session JSON export here, or browse to upload.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Choose File
            </Button>
          </div>
        </div>

        {importError && (
          <p className="mt-3 text-xs text-destructive">{importError}</p>
        )}
        {importWarnings.length > 0 && (
          <div className="mt-3 text-xs text-warning">
            {importWarnings.map((warning) => (
              <div key={warning}>• {warning}</div>
            ))}
          </div>
        )}
      </div>

      {/* Controls: Filter + Sort */}
      {sessions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter pills */}
          <FilterPills value={statusFilter} onChange={setStatusFilter} counts={counts} />

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <SortButton
              label="Date"
              field="date"
              currentField={sortField}
              direction={sortDirection}
              onClick={handleSortClick}
            />
            <SortButton
              label="Confidence"
              field="confidence"
              currentField={sortField}
              direction={sortDirection}
              onClick={handleSortClick}
            />
            <SortButton
              label="Phase"
              field="phase"
              currentField={sortField}
              direction={sortDirection}
              onClick={handleSortClick}
            />
          </div>
        </div>
      )}

      {/* Session cards */}
      <div className="grid gap-3">
        {displayedSessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {sessions.length === 0
                ? "No local sessions yet. Import one to get started."
                : "No sessions match the current filter."}
            </CardContent>
          </Card>
        ) : (
          displayedSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onContinue={handleContinue}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
