"use client";

import { Store } from "@tanstack/store";

const STORAGE_KEY = "brenner-reading-positions";
const MAX_POSITIONS = 50; // Limit stored positions to prevent bloat

export interface ReadingPosition {
  scrollOffset: number; // For virtualized lists
  activeSection: number;
  lastRead: number; // Timestamp
}

interface ReadingState {
  positions: Record<string, ReadingPosition>;
}

function loadInitialState(): ReadingState {
  if (typeof window === "undefined") {
    return { positions: {} };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as ReadingState;
    }
  } catch {
    // Ignore parse errors
  }

  return { positions: {} };
}

export const readingStore = new Store<ReadingState>(loadInitialState());

// Persist to localStorage on state changes (debounced)
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

function persistState() {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }

  persistTimeout = setTimeout(() => {
    try {
      const state = readingStore.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, 500);
}

if (typeof window !== "undefined") {
  // Avoid duplicate subscriptions/listeners during dev HMR by reusing stable globals.
  const GLOBAL_STORAGE_HANDLER_KEY = "__brenner_readingStore_storageHandler__";
  const GLOBAL_UNSUBSCRIBE_KEY = "__brenner_readingStore_unsubscribe__";

  const previousUnsubscribe = (globalThis as unknown as Record<string, unknown>)[GLOBAL_UNSUBSCRIBE_KEY];
  if (typeof previousUnsubscribe === "function") {
    previousUnsubscribe();
  }

  (globalThis as unknown as Record<string, unknown>)[GLOBAL_UNSUBSCRIBE_KEY] = readingStore.subscribe(persistState);

  // Cross-tab sync
  const previousStorageHandler = (globalThis as unknown as Record<string, unknown>)[GLOBAL_STORAGE_HANDLER_KEY];
  if (typeof previousStorageHandler === "function") {
    window.removeEventListener("storage", previousStorageHandler as (e: StorageEvent) => void);
  }

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const newState = JSON.parse(e.newValue) as ReadingState;
        readingStore.setState(() => newState);
      } catch {
        // Ignore parse errors
      }
    }
  };

  window.addEventListener("storage", storageHandler);
  (globalThis as unknown as Record<string, unknown>)[GLOBAL_STORAGE_HANDLER_KEY] = storageHandler;
}

// Actions
export function saveReadingPosition(
  docId: string,
  scrollOffset: number,
  activeSection: number
): void {
  readingStore.setState((state) => {
    const newPositions = {
      ...state.positions,
      [docId]: {
        scrollOffset,
        activeSection,
        lastRead: Date.now(),
      },
    };

    // Prune old positions if we exceed the limit
    const entries = Object.entries(newPositions);
    if (entries.length > MAX_POSITIONS) {
      entries.sort((a, b) => b[1].lastRead - a[1].lastRead);
      const pruned = Object.fromEntries(entries.slice(0, MAX_POSITIONS));
      return { positions: pruned };
    }

    return { positions: newPositions };
  });
}

export function getReadingPosition(docId: string): ReadingPosition | null {
  return readingStore.state.positions[docId] ?? null;
}

export function clearReadingPosition(docId: string): void {
  readingStore.setState((state) => {
    const positions = Object.fromEntries(
      Object.entries(state.positions).filter(([key]) => key !== docId)
    );
    return { positions };
  });
}

export function getRecentDocs(limit: number = 5): string[] {
  const entries = Object.entries(readingStore.state.positions);
  entries.sort((a, b) => b[1].lastRead - a[1].lastRead);
  return entries.slice(0, limit).map(([docId]) => docId);
}
