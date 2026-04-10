import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { SettingsContent } from "./settings-content";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireRole(["super_admin"]);

  if (!user) {
    redirect("/dashboard");
  }

  return <SettingsContent />;
}
