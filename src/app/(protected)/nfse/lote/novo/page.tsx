import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NovoLoteWizard } from "./novo-lote-wizard";

export const metadata = { title: "Novo Lote de NFS-e" };

export default async function NovoLotePage() {
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
  return <NovoLoteWizard empresas={empresas} />;
}
