import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAgendamento } from "@/lib/actions/nfse-agendamentos";
import { AgendamentoDetailContent } from "./agendamento-detail-content";

export const metadata = { title: "Agendamento" };

export default async function AgendamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  const { id } = await params;
  const r = await getAgendamento(id);
  if (!r.success || !r.data) notFound();
  return <AgendamentoDetailContent initial={r.data} />;
}
