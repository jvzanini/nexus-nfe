import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listarAgendamentos } from "@/lib/actions/nfse-agendamentos";
import { AgendamentosListContent } from "./agendamentos-list-content";

export const metadata = { title: "Agendamentos de NFS-e" };

export default async function AgendamentosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  const r = await listarAgendamentos();
  return <AgendamentosListContent initial={r.success && r.data ? r.data : []} />;
}
