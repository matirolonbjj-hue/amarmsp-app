"use client";

import { Bell, HelpCircle, Search, Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/contexts/sidebar-context";

interface HeaderProps {
  searchPlaceholder?: string;
  userName?: string;
}

export function Header({ searchPlaceholder = "Buscar...", userName = "Gerente" }: HeaderProps) {
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/95 backdrop-blur border-b border-border px-4 h-14">
      {/* Hamburguer — só aparece no mobile */}
      <button
        onClick={toggle}
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="p-2 rounded-lg hover:bg-muted transition-colors">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-[#1B9AAA] flex items-center justify-center text-white text-xs font-semibold">
            {userName.charAt(0)}
          </div>
          <span className="text-sm font-medium hidden sm:block">{userName}</span>
        </div>
      </div>
    </header>
  );
}
