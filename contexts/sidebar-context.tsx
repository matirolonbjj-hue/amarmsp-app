"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarCtx = { open: boolean; toggle: () => void; close: () => void };

const SidebarContext = createContext<SidebarCtx>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider
      value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
