import { getCurrentUser } from "@/lib/auth";
import { ProfileContent } from "./profile-content";

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();

  const profile = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: (user as { avatarUrl?: string | null } | null)?.avatarUrl ?? null,
    theme: ((user as { theme?: "dark" | "light" | "system" } | null)?.theme ?? "dark") as
      | "dark"
      | "light"
      | "system",
  };

  return <ProfileContent initial={profile} />;
}
