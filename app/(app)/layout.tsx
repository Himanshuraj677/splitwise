import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-80">
        <div className="absolute left-[-140px] top-[120px] h-[340px] w-[340px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-140px] top-[300px] h-[320px] w-[320px] rounded-full bg-amber-400/10 blur-3xl" />
      </div>
      <Sidebar />
      <main className="lg:ml-64">
        <div className="container mx-auto max-w-7xl p-4 pt-[72px] lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
