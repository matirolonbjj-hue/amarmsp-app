"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type Session } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";

function AuthLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { open, close } = useSidebar();

  useEffect(() => {
    import("@/lib/supabase").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
        if (!session) router.replace("/login");
      });
    });
  }, [router]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Overlay escuro no mobile quando sidebar aberta */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={close}
        />
      )}
      <Sidebar />
      <main className="flex-1 lg:ml-[260px] min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthLayoutInner>{children}</AuthLayoutInner>
    </SidebarProvider>
  );
}
