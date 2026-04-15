import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RelatoriosContent } from "./relatorios-content";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  await requireRole("admin");

  const empresas = await prisma.clienteMei.findMany({
    where: { isActive: true },
    orderBy: { razaoSocial: "asc" },
    select: { id: true, razaoSocial: true },
  });

  return <RelatoriosContent empresas={empresas} />;
}
