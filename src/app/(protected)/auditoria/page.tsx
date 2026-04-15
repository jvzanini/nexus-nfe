import { requireRole } from "@/lib/auth";
import { getAuditFacets } from "@/lib/actions/audit-log";
import { AuditoriaContent } from "./auditoria-content";

export const metadata = { title: "Auditoria" };

export default async function AuditoriaPage() {
  await requireRole("admin");
  const facets = await getAuditFacets();
  return (
    <AuditoriaContent
      initialFacets={
        facets.success && facets.data
          ? facets.data
          : { resourceTypes: [], actions: [], actors: [] }
      }
    />
  );
}
