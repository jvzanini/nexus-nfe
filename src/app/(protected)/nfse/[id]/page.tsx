import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NfseDetailContent } from "./nfse-detail-content";

export const metadata = { title: "Detalhes da NFS-e" };

export default async function NfseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  const { id } = await params;
  return <NfseDetailContent id={id} />;
}
