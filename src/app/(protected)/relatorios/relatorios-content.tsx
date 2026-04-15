"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Ban,
  DollarSign,
  Download,
  RefreshCw,
  Loader2,
  BarChart3,
  FileArchive,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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
  gerarRelatorioEmissao,
  exportarRelatorioCsv,
  exportarLoteZip,
  type RelatorioData,
  type RelatorioFilters,
} from "@/lib/actions/relatorios";
import { toast } from "sonner";

interface Empresa {
  id: string;
  razaoSocial: string;
}

type Periodo = "hoje" | "7dias" | "30dias" | "90dias";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

function periodoToDates(p: Periodo): { dataInicio: string; dataFim: string } {
  const fim = new Date();
  const inicio = new Date();
  if (p === "hoje") {
    inicio.setHours(0, 0, 0, 0);
  } else if (p === "7dias") {
    inicio.setDate(inicio.getDate() - 7);
  } else if (p === "30dias") {
    inicio.setDate(inicio.getDate() - 30);
  } else {
    inicio.setDate(inicio.getDate() - 90);
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

function formatCurrency(v: string | number) {
  const n = typeof v === "string" ? Number(v) : v;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "autorizada", label: "Autorizada" },
  { value: "rejeitada", label: "Rejeitada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "erro", label: "Erro" },
  { value: "pendente", label: "Pendente" },
  { value: "processando", label: "Processando" },
];

const periodoOptions = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "Últimos 7 dias" },
  { value: "30dias", label: "Últimos 30 dias" },
  { value: "90dias", label: "Últimos 90 dias" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    autorizada: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejeitada: "bg-red-500/15 text-red-400 border-red-500/30",
    cancelada: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    erro: "bg-red-500/15 text-red-400 border-red-500/30",
    pendente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    processando: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    rascunho: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

export function RelatoriosContent({ empresas }: { empresas: Empresa[] }) {
  const [periodo, setPeriodo] = useState<Periodo>("30dias");
  const [empresaId, setEmpresaId] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, startExporting] = useTransition();
  const [zipping, startZipping] = useTransition();

  const empresaOptions = useMemo(
    () => [
      { value: "", label: "Todas as empresas" },
      ...empresas.map((e) => ({ value: e.id, label: e.razaoSocial })),
    ],
    [empresas]
  );

  const currentFilters = useCallback((): RelatorioFilters => {
    const { dataInicio, dataFim } = periodoToDates(periodo);
    return {
      dataInicio,
      dataFim,
      clienteMeiId: empresaId || undefined,
      status: status || undefined,
    };
  }, [periodo, empresaId, status]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await gerarRelatorioEmissao(currentFilters());
    if (result.success && result.data) {
      setData(result.data);
    } else {
      toast.error(result.error || "Erro ao carregar relatório");
    }
    setLoading(false);
  }, [currentFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleExport() {
    startExporting(async () => {
      const result = await exportarRelatorioCsv(currentFilters());
      if (!result.success || !result.data) {
        toast.error(result.error || "Erro ao exportar CSV");
        return;
      }
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `relatorio-emissao-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado");
    });
  }

  function handleExportZip() {
    startZipping(async () => {
      const result = await exportarLoteZip(currentFilters());
      if (!result.success || !result.data) {
        toast.error(result.error || "Erro ao gerar ZIP");
        return;
      }
      const bin = atob(result.data.zipBase64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `nfse-lote-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`ZIP com ${result.data.quantidade} notas baixado`);
    });
  }

  const stats = data?.resumo;

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consolidado de emissões por período, empresa e status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportZip}
            disabled={zipping || !data || data.resumo.autorizadas === 0}
            className="gap-2 cursor-pointer"
            title="Baixa XMLs e PDFs das NFS-e autorizadas no período"
          >
            {zipping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" />
            )}
            Exportar ZIP
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={exporting || !data}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar CSV
          </Button>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CustomSelect
          value={periodo}
          onChange={(v) => setPeriodo(v as Periodo)}
          options={periodoOptions}
          placeholder="Período"
        />
        <CustomSelect
          value={empresaId}
          onChange={setEmpresaId}
          options={empresaOptions}
          placeholder="Empresa"
        />
        <CustomSelect
          value={status}
          onChange={setStatus}
          options={statusOptions}
          placeholder="Status"
        />
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={FileText}
          label="Emissões"
          value={stats ? stats.quantidade.toLocaleString("pt-BR") : "—"}
          accent="text-violet-400 bg-violet-500/10"
        />
        <StatCard
          icon={DollarSign}
          label="Total emitido"
          value={stats ? formatCurrency(stats.totalEmitido) : "—"}
          accent="text-emerald-400 bg-emerald-500/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="Autorizadas"
          value={stats ? stats.autorizadas.toLocaleString("pt-BR") : "—"}
          accent="text-emerald-400 bg-emerald-500/10"
        />
        <StatCard
          icon={XCircle}
          label="Rejeitadas"
          value={stats ? stats.rejeitadas.toLocaleString("pt-BR") : "—"}
          accent="text-red-400 bg-red-500/10"
        />
      </motion.div>

      {/* Gráfico */}
      <motion.div variants={itemVariants}>
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Emissões por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {data && data.serie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.serie.map((p) => ({ ...p, valor: Number(p.valor) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="data"
                      stroke="#a3a3a3"
                      fontSize={11}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis stroke="#a3a3a3" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#141414",
                        border: "1px solid #262626",
                        borderRadius: 8,
                      }}
                      labelFormatter={(v) => formatDate(v)}
                      formatter={(value, name) =>
                        name === "valor" ? formatCurrency(Number(value)) : value
                      }
                    />
                    <Bar dataKey="quantidade" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {loading ? "Carregando..." : "Sem dados no período"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabela */}
      <motion.div variants={itemVariants}>
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Emissões detalhadas
              {data && (
                <span className="text-xs text-muted-foreground ml-auto font-normal">
                  {data.items.length} registros
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Empresa</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Série/Número</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Tomador</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Status</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium text-right">Valor</TableHead>
                    <TableHead className="text-xs uppercase text-muted-foreground font-medium">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                      </TableCell>
                    </TableRow>
                  ) : data && data.items.length > 0 ? (
                    data.items.map((it) => (
                      <TableRow key={it.id} className="hover:bg-accent/30 transition-colors">
                        <TableCell className="text-foreground text-sm">
                          <div className="font-medium">{it.empresaRazaoSocial}</div>
                          <div className="text-xs text-muted-foreground font-mono">{it.empresaCnpj}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {it.serie}-{it.numero}
                          {it.numeroNfse && (
                            <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                              NFS-e {it.numeroNfse}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div>{it.tomadorNome}</div>
                          <div className="text-xs font-mono">{it.tomadorDocumento}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={it.status} />
                        </TableCell>
                        <TableCell className="text-right text-foreground tabular-nums">
                          {formatCurrency(it.valorServico)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(it.dataEmissao)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <Ban className="h-5 w-5 inline mr-2" /> Sem resultados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Card className="border-border bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg font-semibold text-foreground truncate">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
