"use client";

/**
 * ExcerptBasketContext - Context for managing the excerpt basket state
 *
 * Provides methods to add items to the basket from anywhere in the app,
 * most commonly from search results.
 */

import * as React from "react";
import type { BasketItem } from "./ExcerptBasket";

// ============================================================================
// Types
// ============================================================================

interface BasketContextType {
  items: BasketItem[];
  addItem: (item: Omit<BasketItem, "id" | "addedAt">) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  isOpen: boolean;
  openBasket: () => void;
  closeBasket: () => void;
}

// ============================================================================
// Context
// ============================================================================

const BasketContext = React.createContext<BasketContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

const STORAGE_KEY = "brenner-excerpt-basket";

export function ExcerptBasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<BasketItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Failed to load basket from localStorage:", error);
    }
  }, []);

  // Save to localStorage when items change
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn("Failed to save basket to localStorage:", error);
    }
  }, [items]);

  const addItem = React.useCallback((item: Omit<BasketItem, "id" | "addedAt">) => {
    const newItem: BasketItem = {
      ...item,
      id: `${item.anchor}-${Date.now()}`,
      addedAt: Date.now(),
    };
    setItems((prev) => [...prev, newItem]);
    // Auto-open basket when adding first item
    setIsOpen(true);
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearItems = React.useCallback(() => {
    setItems([]);
  }, []);

  const openBasket = React.useCallback(() => setIsOpen(true), []);
  const closeBasket = React.useCallback(() => setIsOpen(false), []);

  return (
    <BasketContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearItems,
        isOpen,
        openBasket,
        closeBasket,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useExcerptBasket() {
  const context = React.useContext(BasketContext);
  if (!context) {
    throw new Error("useExcerptBasket must be used within an ExcerptBasketProvider");
  }
  return context;
}
