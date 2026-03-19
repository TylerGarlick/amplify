import { prisma } from "@/lib/prisma";
import { MusiciansAdminClient } from "@/components/admin/MusiciansAdminClient";

export default async function AdminMusiciansPage() {
  const musicians = await prisma.musician.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      _count: { select: { tracks: true, stages: true } },
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Musicians</h1>
        <p className="text-sm text-zinc-500">{musicians.length} musician profiles</p>
      </div>
      <MusiciansAdminClient musicians={musicians} />
    </div>
  );
}
