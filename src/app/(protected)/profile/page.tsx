import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileContent } from "./profile-content";

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const dbUser = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailNotifications: true },
      })
    : null;

  const profile = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: (user as { avatarUrl?: string | null } | null)?.avatarUrl ?? null,
    theme: ((user as { theme?: "dark" | "light" | "system" } | null)?.theme ?? "dark") as
      | "dark"
      | "light"
      | "system",
    emailNotifications: dbUser?.emailNotifications ?? true,
  };

  return <ProfileContent initial={profile} />;
}
