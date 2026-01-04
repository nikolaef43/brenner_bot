"use client";

/**
 * Session List + Import
 *
 * Lists locally stored Brenner Loop sessions and provides
 * import support (file picker + drag-and-drop).
 *
 * @see brenner_bot-1v26.4 (bead)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  sessionStorage,
  importSession,
  getPhaseName,
  type SessionSummary,
} from "@/lib/brenner-loop";

// ============================================================================
// Types
// ============================================================================

export interface SessionListProps {
  className?: string;
  onSelect?: (sessionId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function SessionList({ className, onSelect }: SessionListProps) {
  const [sessions, setSessions] = React.useState<SessionSummary[]>([]);
  const [importWarnings, setImportWarnings] = React.useState<string[]>([]);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  return (
    <div className={cn("flex flex-col gap-4", className)}>
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

      <div className="grid gap-3">
        {sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No local sessions yet. Import one to get started.
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">{session.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {session.hypothesis || "No hypothesis summary"} · {getPhaseName(session.phase)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Updated {new Date(session.updatedAt).toLocaleString()}
                  </div>
                </div>
                {onSelect && (
                  <Button size="sm" variant="outline" onClick={() => onSelect(session.id)}>
                    Open
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
