"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { type Session } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/sidebar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
