import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { UsersContent } from "./users-content";

export const metadata = { title: "Usuários" };

export default async function UsersPage() {
  const user = await requireRole(["admin", "super_admin"]);

  if (!user) {
    redirect("/dashboard");
  }

  return <UsersContent currentRole={user.role} />;
}
