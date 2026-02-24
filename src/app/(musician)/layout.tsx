import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MusicianSidebar } from "@/components/layout/MusicianSidebar";

export default async function MusicianLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || (role !== "MUSICIAN" && role !== "ADMIN")) {
    redirect("/ar");
  }

  return (
    <div className="flex min-h-screen bg-black">
      <MusicianSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
