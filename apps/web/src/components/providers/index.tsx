"use client";

/**
 * Providers Index
 *
 * Central export for all React context providers.
 * Import from here to get all providers in one place.
 */

export { QueryProvider, getQueryClient, type QueryProviderProps } from "./QueryProvider";

// ============================================================================
// UNIFIED PROVIDERS WRAPPER
// ============================================================================

import * as React from "react";
import { QueryProvider } from "./QueryProvider";
import { ExcerptBasketProvider } from "@/components/excerpt";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Unified Providers component that wraps all application providers.
 *
 * Provider order matters:
 * 1. QueryProvider (TanStack Query) - outermost for data layer
 * 2. (Future) StoreProvider - for client state
 * 3. (Future) ThemeProvider - for theming
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { Providers } from "@/components/providers";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Providers>{children}</Providers>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ExcerptBasketProvider>{children}</ExcerptBasketProvider>
    </QueryProvider>
  );
}

export type { ProvidersProps };
