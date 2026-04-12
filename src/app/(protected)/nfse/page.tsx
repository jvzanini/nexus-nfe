import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NfseContent } from "./nfse-content";

export const metadata = { title: "Notas Fiscais" };

export default async function NfsePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  return <NfseContent />;
}
