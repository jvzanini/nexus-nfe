import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ClientesContent } from "./clientes-content";

export const metadata = { title: "Clientes MEI" };

export default async function ClientesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "super_admin" && user.platformRole !== "admin") {
    redirect("/dashboard");
  }
  return <ClientesContent />;
}
