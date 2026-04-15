import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listarLotes } from "@/lib/actions/nfse-lote";
import { LoteListContent } from "./lote-list-content";

export const metadata = { title: "Emissão em Lote" };

export default async function LoteListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  const result = await listarLotes();
  const lotes = result.success && result.data ? result.data : [];
  return <LoteListContent initialLotes={lotes} />;
}
