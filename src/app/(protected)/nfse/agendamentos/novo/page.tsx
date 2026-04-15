import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NovoAgendamentoForm } from "./novo-agendamento-form";

export const metadata = { title: "Novo Agendamento" };

export default async function NovoAgendamentoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  const empresas = await prisma.clienteMei.findMany({
    where: { isActive: true },
    orderBy: { razaoSocial: "asc" },
    select: { id: true, razaoSocial: true, cnpj: true },
  });
  return <NovoAgendamentoForm empresas={empresas} />;
}
