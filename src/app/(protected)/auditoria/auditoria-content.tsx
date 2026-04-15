"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Download,
  RefreshCw,
  Loader2,
  Eye,
  User as UserIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listAuditLogs, exportAuditLogsCsv } from "@/lib/actions/audit-log";
import { toast } from "sonner";

interface Facets {
  resourceTypes: string[];
  actions: string[];
  actors: Array<{ id: string; label: string }>;
}

interface LogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorLabel: string;
  actorId: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

type Periodo = "7dias" | "30dias" | "90dias" | "tudo";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

function periodoToDates(p: Periodo): { dataInicio?: string; dataFim?: string } {
  if (p === "tudo") return {};
  const fim = new Date();
  const inicio = new Date();
  if (p === "7dias") inicio.setDate(inicio.getDate() - 7);
  else if (p === "30dias") inicio.setDate(inicio.getDate() - 30);
  else inicio.setDate(inicio.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR");
}

export function AuditoriaContent({ initialFacets }: { initialFacets: Facets }) {
  const [periodo, setPeriodo] = useState<Periodo>("30dias");
  const [resourceType, setResourceType] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, startExporting] = useTransition();
  const [detailItem, setDetailItem] = useState<LogItem | null>(null);

  const periodoOptions = [
    { value: "7dias", label: "Últimos 7 dias" },
    { value: "30dias", label: "Últimos 30 dias" },
    { value: "90dias", label: "Últimos 90 dias" },
    { value: "tudo", label: "Todo o histórico" },
  ];

  const resourceOptions = useMemo(
    () => [
      { value: "", label: "Todos os recursos" },
      ...initialFacets.resourceTypes.map((r) => ({ value: r, label: r })),
    ],
    [initialFacets.resourceTypes]
  );

  const actionOptions = useMemo(
    () => [
      { value: "", label: "Todas as ações" },
      ...initialFacets.actions.map((a) => ({ value: a, label: a })),
    ],
    [initialFacets.actions]
  );

  const actorOptions = useMemo(
    () => [
      { value: "", label: "Todos os atores" },
      ...initialFacets.actors.map((a) => ({ value: a.id, label: a.label })),
    ],
    [initialFacets.actors]
  );

  const buildFilters = useCallback(() => {
    return {
      ...periodoToDates(periodo),
      resourceType: resourceType || null,
      action: action || null,
      actorId: actorId || null,
      limit: 200,
    };
  }, [periodo, resourceType, action, actorId]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAuditLogs(buildFilters());
    if (result.success && result.data) {
      setLogs(result.data.items);
    } else {
      toast.error(result.error || "Erro ao carregar logs");
    }
    setLoading(false);
  }, [buildFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleExport() {
    startExporting(async () => {
      const result = await exportAuditLogsCsv(buildFilters());
      if (!result.success || !result.data) {
        toast.error(result.error || "Erro ao exportar");
        return;
      }
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `auditoria-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado");
    });
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-violet-400" />
            Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro completo de ações realizadas na plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2 cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={exporting || logs.length === 0}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </Button>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CustomSelect value={periodo} onChange={(v) => setPeriodo(v as Periodo)} options={periodoOptions} placeholder="Período" />
        <CustomSelect value={resourceType} onChange={setResourceType} options={resourceOptions} placeholder="Recurso" />
        <CustomSelect value={action} onChange={setAction} options={actionOptions} placeholder="Ação" />
        <CustomSelect value={actorId} onChange={setActorId} options={actorOptions} placeholder="Ator" />
      </motion.div>

      {/* Tabela */}
      <motion.div variants={itemVariants}>
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Eventos registrados
              <span className="text-xs text-muted-foreground ml-auto font-normal">
                {logs.length} registros
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Data/hora</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Ator</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Ação</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Recurso</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">IP</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                      </TableCell>
                    </TableRow>
                  ) : logs.length > 0 ? (
                    logs.map((l) => (
                      <TableRow key={l.id} className="hover:bg-accent/30 transition-colors">
                        <TableCell className="text-muted-foreground text-xs font-mono whitespace-nowrap">
                          {formatDateTime(l.createdAt)}
                        </TableCell>
                        <TableCell className="text-foreground text-sm">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {l.actorLabel}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {l.action}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {l.resourceType}
                          {l.resourceId && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono ml-1">
                              {l.resourceId.slice(0, 8)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {l.ipAddress ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => setDetailItem(l)}
                            className="cursor-pointer text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Sem registros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detalhe */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do evento</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              <InfoRow label="Data/hora" value={formatDateTime(detailItem.createdAt)} />
              <InfoRow label="Ator" value={detailItem.actorLabel} />
              <InfoRow label="Ação" value={detailItem.action} mono />
              <InfoRow label="Recurso" value={`${detailItem.resourceType}${detailItem.resourceId ? " / " + detailItem.resourceId : ""}`} mono />
              <InfoRow label="IP" value={detailItem.ipAddress ?? "—"} mono />
              <InfoRow label="User-Agent" value={detailItem.userAgent ?? "—"} mono small />
              <div>
                <div className="text-xs text-muted-foreground mb-1">Payload</div>
                <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-96 text-foreground/90">
                  {JSON.stringify(detailItem.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <span
        className={`${mono ? "font-mono" : ""} ${small ? "text-xs" : ""} text-foreground break-all`}
      >
        {value}
      </span>
    </div>
  );
}
