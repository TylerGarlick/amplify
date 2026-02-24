import { prisma } from "@/lib/prisma";
import { UsersAdminClient } from "@/components/admin/UsersAdminClient";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { musician: { select: { id: true, displayName: true, status: true } } },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Users</h1>
        <p className="text-sm text-zinc-500">{users.length} registered users</p>
      </div>
      <UsersAdminClient users={users} />
    </div>
  );
}
