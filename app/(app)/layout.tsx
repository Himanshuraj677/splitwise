import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64">
        <div className="container mx-auto max-w-7xl p-4 pt-[72px] lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
