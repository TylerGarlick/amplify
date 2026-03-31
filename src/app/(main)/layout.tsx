import { BottomNav } from "@/components/layout/BottomNav";
import { SessionProvider } from "next-auth/react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-black pb-16">
        {children}
        <BottomNav />
      </div>
    </SessionProvider>
  );
}
