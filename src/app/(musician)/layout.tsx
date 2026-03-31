import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MusicianBottomNav } from "@/components/layout/MusicianBottomNav";

export default async function MusicianLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || (role !== "MUSICIAN" && role !== "ADMIN")) {
    redirect("/ar");
  }

  return (
    <div className="flex min-h-screen bg-black">
      <main className="flex-1 overflow-auto pb-20 px-4 md:px-6">{children}</main>
      <MusicianBottomNav />
    </div>
  );
}
