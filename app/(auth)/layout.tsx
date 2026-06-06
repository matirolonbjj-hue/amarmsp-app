import { Sidebar } from "@/components/layout/sidebar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
