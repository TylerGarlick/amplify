import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
