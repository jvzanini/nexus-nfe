import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLoteDetail } from "@/lib/actions/nfse-lote";
import { LoteDetailContent } from "./lote-detail-content";

export const metadata = { title: "Detalhe do Lote" };

export default async function LoteDetailPage({
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
  const r = await getLoteDetail(id);
  if (!r.success || !r.data) notFound();
  return <LoteDetailContent initial={r.data} />;
}
