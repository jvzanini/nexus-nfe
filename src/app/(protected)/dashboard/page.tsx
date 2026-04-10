import { auth } from "@/auth";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata = { title: "Dashboard | Nexus NFE" };

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || "Usuário";
  return <DashboardContent userName={userName} />;
}
