"use client";

/**
 * ExcerptBasket - UI component for building transcript excerpts
 *
 * Allows users to:
 * 1. Add search hits / selected sections to a basket
 * 2. Reorder selections via drag-and-drop
 * 3. Add optional notes per selection
 * 4. Export as formatted markdown using excerpt-builder.ts
 * 5. Persist drafts in localStorage
 *
 * @example
 * ```tsx
 * <ExcerptBasket
 *   onExport={(markdown) => {
 *     // Paste into session form excerpt field
 *   }}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  composeExcerpt,
  type ExcerptSection,
  type ComposedExcerpt,
} from "@/lib/excerpt-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  GripVertical,
  X,
  Clipboard,
  ClipboardCheck,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface BasketItem {
  id: string;
  anchor: string;
  quote: string;
  title?: string;
  note?: string;
  addedAt: number;
}

interface ExcerptBasketProps {
  /** Callback when user exports the excerpt */
  onExport?: (markdown: string, excerpt: ComposedExcerpt) => void;
  /** Optional theme for the excerpt header */
  theme?: string;
  /** Class name for container */
  className?: string;
}

// ============================================================================
// localStorage Key
// ============================================================================

const STORAGE_KEY = "brenner-excerpt-basket";

// ============================================================================
// Utility Hooks
// ============================================================================

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = React.useState<T>(initialValue);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn("Failed to load from localStorage:", error);
    }
  }, [key]);

  // Update localStorage when value changes
  const setValue = React.useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn("Failed to save to localStorage:", error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

// ============================================================================
// Main Component
// ============================================================================

export function ExcerptBasket({ onExport, theme, className }: ExcerptBasketProps) {
  const [items, setItems] = useLocalStorage<BasketItem[]>(STORAGE_KEY, []);
  const [excerptTheme, setExcerptTheme] = React.useState(theme ?? "");
  const [copied, setCopied] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [composed, setComposed] = React.useState<ComposedExcerpt | null>(null);

  // Compose excerpt whenever items or theme change
  React.useEffect(() => {
    if (items.length === 0) {
      setComposed(null);
      return;
    }

    const sections: ExcerptSection[] = items.map((item) => ({
      anchor: item.anchor,
      quote: item.quote,
      title: item.title,
    }));

    const result = composeExcerpt({
      theme: excerptTheme || undefined,
      sections,
      ordering: "relevance", // Keep user's order
    });

    setComposed(result);
  }, [items, excerptTheme]);

  // Add item to basket
  const addItem = React.useCallback((item: Omit<BasketItem, "id" | "addedAt">) => {
    const newItem: BasketItem = {
      ...item,
      id: `${item.anchor}-${Date.now()}`,
      addedAt: Date.now(),
    };
    setItems((prev) => [...prev, newItem]);
  }, [setItems]);

  // Remove item from basket
  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [setItems]);

  // Reorder items
  const moveItem = React.useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  }, [setItems]);

  // Clear all items
  const clearBasket = React.useCallback(() => {
    setItems([]);
  }, [setItems]);

  // Copy to clipboard
  const copyToClipboard = React.useCallback(async () => {
    if (!composed) return;
    try {
      await navigator.clipboard.writeText(composed.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [composed]);

  // Export callback
  const handleExport = React.useCallback(() => {
    if (!composed || !onExport) return;
    onExport(composed.markdown, composed);
  }, [composed, onExport]);

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">Excerpt Basket</h3>
          {items.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {items.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="size-8 p-0">
          {isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Theme Input */}
          <Input
            value={excerptTheme}
            onChange={(e) => setExcerptTheme(e.target.value)}
            placeholder="Excerpt theme (optional)"
            className="text-sm"
          />

          {/* Items List */}
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <BasketItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={items.length}
                  onRemove={() => removeItem(item.id)}
                  onMoveUp={() => moveItem(index, Math.max(0, index - 1))}
                  onMoveDown={() => moveItem(index, Math.min(items.length - 1, index + 1))}
                />
              ))}
            </div>
          )}

          {/* Warnings */}
          {composed && composed.warnings.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="size-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-600 dark:text-amber-400">
                {composed.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {composed && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{composed.anchors.length} sections</span>
              <span>~{composed.wordCount} words</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={!composed || items.length === 0}
              className="gap-2"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Clipboard className="size-4" />
                  Copy
                </>
              )}
            </Button>
            {onExport && (
              <Button
                variant="default"
                size="sm"
                onClick={handleExport}
                disabled={!composed || items.length === 0}
                className="gap-2"
              >
                <Download className="size-4" />
                Export
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearBasket}
              disabled={items.length === 0}
              className="text-destructive hover:text-destructive gap-2"
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyState() {
  return (
    <div className="py-8 text-center">
      <div className="inline-flex items-center justify-center size-12 rounded-xl bg-muted/50 mb-3">
        <Plus className="size-6 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium text-foreground mb-1">No selections yet</h4>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        Use the search (Cmd+K) to find transcript sections, then add them to your excerpt basket.
      </p>
    </div>
  );
}

function BasketItemRow({
  item,
  index,
  totalItems,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: BasketItem;
  index: number;
  totalItems: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="group flex items-start gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* Reorder Handle */}
      <div className="flex flex-col gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="size-6 p-0"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          <ChevronUp className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="size-6 p-0"
          onClick={onMoveDown}
          disabled={index === totalItems - 1}
        >
          <ChevronDown className="size-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {item.anchor}
          </span>
          {item.title && (
            <span className="text-sm font-medium text-foreground truncate">
              {item.title}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {item.quote}
        </p>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

// Helper to create basket items from search hits
export function createBasketItem(hit: {
  anchor?: string;
  title: string;
  snippet: string;
}): Omit<BasketItem, "id" | "addedAt"> {
  return {
    anchor: hit.anchor ?? "",
    quote: hit.snippet,
    title: hit.title,
  };
}
