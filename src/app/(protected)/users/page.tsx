import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UsersContent } from "./users-content";

export const metadata = { title: "Usuários" };

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  return (
    <UsersContent
      isSuperAdmin={user.platformRole === "super_admin"}
      currentUserId={user.id}
    />
  );
}
