"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

/**
 * Hook for persisting state to localStorage with SSR safety.
 * Includes debounced writes for performance.
 *
 * @param key - localStorage key
 * @param initialValue - Default value if nothing in storage
 * @param options - Configuration options
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: { debounceMs?: number } = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const { debounceMs = 300 } = options;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track latest value for use in cleanup (avoids stale closure bug)
  const latestValueRef: MutableRefObject<T | null> = useRef<T | null>(null);

  // Initialize state with value from localStorage or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item) as T);
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" on hydration:`, error);
      }
    });
  }, [key]);

  // Setter with debounced persistence
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;

        // Debounce the localStorage write
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
          }
        }, debounceMs);

        return valueToStore;
      });
    },
    [key, debounceMs]
  );

  // Remove from storage
  const removeValue = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Keep latestValueRef in sync (for use in cleanup without stale closure)
  useEffect(() => {
    latestValueRef.current = storedValue;
  }, [storedValue]);

  // Persist on unmount if there's a pending debounce
  // NOTE: Only depends on `key`, NOT `storedValue` - we use latestValueRef to avoid
  // the stale closure bug where cleanup would write old values on every state change
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        // Use ref to get the actual latest value, not a stale closure
        if (latestValueRef.current !== null) {
          try {
            window.localStorage.setItem(key, JSON.stringify(latestValueRef.current));
          } catch {
            // Ignore errors on cleanup
          }
        }
      }
    };
  }, [key]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Simple hook for reading position storage (updates frequently).
 * Uses sessionStorage for less aggressive persistence.
 */
export function useReadingPosition(
  docId: string
): [number, (position: number) => void] {
  const key = `brenner_reading_pos_${docId}`;

  const [position, setPosition] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.sessionStorage.getItem(key);
    return stored ? parseFloat(stored) : 0;
  });

  const updatePosition = useCallback(
    (newPosition: number) => {
      setPosition(newPosition);
      try {
        window.sessionStorage.setItem(key, newPosition.toString());
      } catch {
        // Ignore storage errors
      }
    },
    [key]
  );

  return [position, updatePosition];
}
