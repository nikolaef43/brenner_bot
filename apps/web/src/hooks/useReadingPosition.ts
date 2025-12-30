"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-store";
import {
  readingStore,
  saveReadingPosition,
  clearReadingPosition,
  type ReadingPosition,
} from "@/stores/readingStore";

interface UseReadingPositionOptions {
  /** Debounce delay in ms for saving position (default: 500) */
  debounceMs?: number;
  /** Maximum section index - positions beyond this are treated as invalid */
  maxSection?: number;
}

interface UseReadingPositionReturn {
  /** Current saved position, or null if none */
  position: ReadingPosition | null;
  /** Save current reading position (debounced) */
  save: (scrollOffset: number, activeSection: number) => void;
  /** Clear saved position for this document */
  clear: () => void;
  /** Whether we should restore position on mount (true only once, then becomes false) */
  shouldRestore: boolean;
}

/**
 * Hook for persisting and restoring reading positions.
 *
 * @param docId - Unique document identifier (e.g., "transcript", "distillation-opus-45")
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function TranscriptViewer({ docId, data }) {
 *   const { position, save, shouldRestore } = useReadingPosition(docId, {
 *     maxSection: data.sections.length - 1,
 *   });
 *
 *   // Restore position on mount
 *   useEffect(() => {
 *     if (shouldRestore && position) {
 *       virtualizer.scrollToIndex(position.activeSection, { align: 'start' });
 *     }
 *   }, [shouldRestore]);
 *
 *   // Save on scroll
 *   const handleScroll = () => {
 *     save(virtualizer.scrollOffset, activeSection);
 *   };
 * }
 * ```
 */
export function useReadingPosition(
  docId: string,
  options: UseReadingPositionOptions = {}
): UseReadingPositionReturn {
  const { debounceMs = 500, maxSection } = options;

  const position = useStore(readingStore, (state) => state.positions[docId] ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track restoration using a keyed ref pattern (allowed by React rules)
  // The ref contains both the docId and restoration flag, reset when docId changes
  const restorationRef = useRef<{ docId: string; restored: boolean } | null>(null);

  // Initialize or reset the restoration tracking when docId changes
  // This pattern is allowed: checking ref.current and initializing conditionally
  if (restorationRef.current === null || restorationRef.current.docId !== docId) {
    restorationRef.current = { docId, restored: false };
  }

  // Validate position against maxSection
  const validPosition =
    position &&
    (maxSection === undefined || position.activeSection <= maxSection)
      ? position
      : null;

  // Debounced save
  const save = useCallback(
    (scrollOffset: number, activeSection: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        saveReadingPosition(docId, scrollOffset, activeSection);
      }, debounceMs);
    },
    [docId, debounceMs]
  );

  // Clear position
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    clearReadingPosition(docId);
  }, [docId]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Compute shouldRestore - true only on first render with valid position
  // After returning shouldRestore=true once, mark as restored
  const restorationState = restorationRef.current;
  const shouldRestore = !restorationState.restored && validPosition !== null;

  // Mark as restored after this render (side effect at end of render is ok for refs)
  if (shouldRestore) {
    restorationState.restored = true;
  }

  return {
    position: validPosition,
    save,
    clear,
    shouldRestore,
  };
}
