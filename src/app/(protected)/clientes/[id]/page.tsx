import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getClienteMei } from "@/lib/actions/clientes-mei";
import { listCertificados } from "@/lib/actions/certificados";
import { ClienteDetailContent } from "./cliente-detail-content";

export const metadata = { title: "Detalhe do Cliente MEI" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [clienteRes, certsRes] = await Promise.all([
    getClienteMei(id),
    listCertificados(id),
  ]);

  if (!clienteRes.success || !clienteRes.data) {
    notFound();
  }

  return (
    <ClienteDetailContent
      cliente={clienteRes.data}
      certificados={certsRes.data ?? []}
    />
  );
}
