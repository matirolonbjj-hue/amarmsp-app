"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useSidebar } from "@/contexts/sidebar-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Estoque", icon: Package },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/despesas", label: "Despesas", icon: Receipt },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { open, close } = useSidebar();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 h-screen w-[260px] flex flex-col bg-[#0D6E7A] text-white transition-transform duration-300",
        // Mobile: escondida por padrão, aparece quando open=true
        // Desktop (lg+): sempre visível
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex items-center justify-center px-6 py-5 border-b border-white/10">
        <Image
          src="/logo_white.png"
          alt="A MAR"
          width={140}
          height={70}
          className="object-contain"
          priority
        />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-[#1B9AAA] text-white shadow-sm border-l-[3px] border-white/80"
                  : "text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/configuracoes"
          onClick={close}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            pathname === "/configuracoes"
              ? "bg-[#1B9AAA] text-white shadow-sm border-l-[3px] border-white/80"
              : "text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
          )}
        >
          <Settings className="w-5 h-5" strokeWidth={2} />
          Configurações
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          Sair
        </button>
      </div>
    </aside>
  );
}
