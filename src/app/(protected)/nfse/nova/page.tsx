import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NovaNfseForm } from "@/components/nfse/nova-nfse-form";

export const metadata = { title: "Nova NFS-e" };

export default async function NovaNfsePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  return <NovaNfseForm />;
}
