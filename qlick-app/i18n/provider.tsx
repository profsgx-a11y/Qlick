"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "./shared";

/**
 * Makes the active-locale dictionary available to any client component via
 * `useDict()`, so we don't have to drill `dict` through props across the
 * dashboard / account / booking trees. Mounted once in `[locale]/layout.tsx`
 * with the server-loaded dictionary.
 */
const DictContext = createContext<Dictionary | null>(null);

export function DictProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: ReactNode;
}) {
  return <DictContext.Provider value={dict}>{children}</DictContext.Provider>;
}

export function useDict(): Dictionary {
  const dict = useContext(DictContext);
  if (!dict) {
    throw new Error("useDict must be used within <DictProvider>");
  }
  return dict;
}
