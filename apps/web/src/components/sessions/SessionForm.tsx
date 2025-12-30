"use client";

/**
 * SessionForm - Client Component for Session Creation
 *
 * Uses TanStack Query mutation for proper loading/error state management.
 * Renders the Brenner Loop session kickoff form with:
 * - Real-time validation feedback
 * - Loading spinner during submission
 * - Error display with actionable messages
 * - Success notification and redirect
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useSessionMutation,
  getSessionErrorMessage,
  type SessionKickoffInput,
} from "@/hooks/mutations/useSessionMutation";

// ============================================================================
// Icons
// ============================================================================

const SendIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const AlertCircleIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface SessionFormProps {
  /** Default sender name (from env) */
  defaultSender?: string;
  /** Default project key (from env) */
  defaultProjectKey?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SessionForm({ defaultSender = "", defaultProjectKey = "" }: SessionFormProps) {
  const router = useRouter();
  const mutation = useSessionMutation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    // Build input from form data
    const recipientsRaw = String(formData.get("to") || "");
    const recipients = recipientsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const input: SessionKickoffInput = {
      projectKey: defaultProjectKey || undefined,
      sender: String(formData.get("sender") || "").trim(),
      recipients,
      threadId: String(formData.get("threadId") || "").trim(),
      subject: String(formData.get("subject") || "").trim() || undefined,
      excerpt: String(formData.get("excerpt") || "").trim(),
      theme: String(formData.get("theme") || "").trim() || undefined,
      domain: String(formData.get("domain") || "").trim() || undefined,
      question: String(formData.get("question") || "").trim() || undefined,
      ackRequired: formData.get("ackRequired") === "on",
    };

    mutation.mutate(input, {
      onSuccess: (result) => {
        // Redirect to success state
        router.push(`/sessions/new?sent=1&thread=${encodeURIComponent(result.threadId)}`);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {mutation.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3 animate-fade-in-up">
          <div className="text-destructive mt-0.5">
            <AlertCircleIcon />
          </div>
          <div>
            <div className="font-semibold text-destructive">Failed to send kickoff</div>
            <p className="text-sm text-muted-foreground mt-1">
              {getSessionErrorMessage(mutation.error)}
            </p>
          </div>
        </div>
      )}

      {/* Session Setup */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Session Setup</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="threadId"
            label="Thread ID"
            placeholder="FEAT-123"
            hint="Unique identifier for this research thread"
            required
            disabled={mutation.isPending}
          />
          <Input
            name="sender"
            label="Your Agent Name"
            defaultValue={defaultSender}
            placeholder="GreenCastle"
            hint="How you'll appear in Agent Mail"
            required
            disabled={mutation.isPending}
          />
        </div>

        <Input
          name="to"
          label="Recipients"
          placeholder="BlueMountain, RedForest"
          hint="Comma-separated list of agent names"
          required
          disabled={mutation.isPending}
        />

        <Input
          name="subject"
          label="Subject"
          placeholder="[FEAT-123] Brenner Loop kickoff"
          hint="Optional - will auto-generate from thread ID if left blank"
          disabled={mutation.isPending}
        />
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Content</h2>

        <Textarea
          name="excerpt"
          label="Transcript Excerpt"
          placeholder="Paste transcript chunks here (with section headings if you have them)."
          hint="The raw Brenner transcript material to analyze"
          className="min-h-[200px] font-mono text-sm"
          autoResize
          required
          disabled={mutation.isPending}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            name="theme"
            label="Theme"
            placeholder="decision experiments"
            hint="Optional focus area"
            disabled={mutation.isPending}
          />
          <Input
            name="domain"
            label="Domain"
            placeholder="biology"
            hint="Optional field context"
            disabled={mutation.isPending}
          />
          <Input
            name="question"
            label="Question"
            placeholder="What's the most discriminative next experiment?"
            hint="Optional guiding question"
            disabled={mutation.isPending}
          />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Options</h2>

        <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            name="ackRequired"
            disabled={mutation.isPending}
            className="size-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-background disabled:opacity-50"
          />
          <div>
            <div className="font-medium text-foreground">Require acknowledgment</div>
            <div className="text-sm text-muted-foreground">
              Recipients must explicitly confirm receipt
            </div>
          </div>
        </label>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <Button type="submit" size="lg" className="gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <LoadingSpinner />
              Sending...
            </>
          ) : (
            <>
              <SendIcon />
              Send Kickoff
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          {mutation.isPending
            ? "Composing prompt and sending to Agent Mail..."
            : "This will compose and send a Brenner Loop prompt to the specified agents."}
        </p>
      </div>
    </form>
  );
}
