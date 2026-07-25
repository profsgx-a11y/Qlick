"use client";

import { createContext, useContext, useState } from "react";

interface MobileNavState {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const MobileNavContext = createContext<MobileNavState>({
  open: false,
  setOpen: () => {},
});

/**
 * Shares the mobile sidebar-drawer open/close state between the hamburger
 * button (in the Topbar) and the drawer itself (the Sidebar). Wraps the whole
 * dashboard so both can read/write it. No effect on desktop (the `desk:`
 * variant — wide AND tall enough), where the sidebar is a permanent in-flow
 * column; landscape phones use the drawer like portrait mobile.
 */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export const useMobileNav = () => useContext(MobileNavContext);
