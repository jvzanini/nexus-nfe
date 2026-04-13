import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ApiDocsContent } from "./api-docs-content";

export const metadata = { title: "Documentação da API" };

export default async function ApiDocsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ApiDocsContent />;
}
