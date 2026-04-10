import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const sidebarUser = {
    name: user.name || user.email || "Usuário",
    email: user.email || "",
    role: user.role || "viewer",
    avatarUrl: (user as { avatarUrl?: string | null }).avatarUrl ?? null,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={sidebarUser} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 sm:pt-8 sm:pb-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
