"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FileText,
  Building2,
  AlertTriangle,
  DollarSign,
  BarChart3,
  RefreshCw,
  Zap,
  Loader2,
  type LucideIcon,
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
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  getDashboardData,
  type DashboardData,
} from "@/lib/actions/dashboard";

interface DashboardContentProps {
  userName: string;
}

type Periodo = "hoje" | "7dias" | "30dias";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className:
      "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  pendente: {
    label: "Pendente",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  processando: {
    label: "Processando",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  autorizada: {
    label: "Autorizada",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  rejeitada: {
    label: "Rejeitada",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  cancelada: {
    label: "Cancelada",
    className:
      "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  substituida: {
    label: "Substituida",
    className:
      "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground",
  },
  erro: {
    label: "Erro",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.rascunho;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function periodoLabel(p: Periodo): string {
  if (p === "hoje") return "hoje";
  if (p === "7dias") return "7 dias";
  return "30 dias";
}

interface StatCardDef {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>("30dias");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await getDashboardData(periodo);
      if (res.success && res.data) setData(res.data);
      setLoading(false);
      setRefreshing(false);
    },
    [periodo]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const now = new Date();
  const weekdays = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const weekday = weekdays[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const today = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month} de ${year}`;

  const stats: StatCardDef[] = data
    ? [
        {
          label: "NFS-e Emitidas",
          value: data.stats.totalEmitidas.toLocaleString("pt-BR"),
          icon: FileText,
          iconBg: "bg-violet-500/10",
          iconColor: "text-violet-400",
        },
        {
          label: "Empresas Ativas",
          value: data.stats.empresasAtivas.toLocaleString("pt-BR"),
          icon: Building2,
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-400",
        },
        {
          label: "Falhas no Período",
          value: data.stats.totalFalhas.toLocaleString("pt-BR"),
          icon: AlertTriangle,
          iconBg: "bg-red-500/10",
          iconColor: "text-red-400",
        },
        {
          label: "Valor Total Emitido",
          value: formatBRL(data.stats.valorTotalEmitido),
          icon: DollarSign,
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-400",
        },
      ]
    : [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Greeting + Bell */}
      <motion.div
        variants={itemVariants}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Olá, {userName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <NotificationBell />
      </motion.div>

      {/* Title + Period Toggle + Refresh */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(["hoje", "7dias", "30dias"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  periodo === p
                    ? "bg-violet-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "hoje" ? "Hoje" : p === "7dias" ? "7 dias" : "30 dias"}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Atualizar"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </motion.div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={itemVariants}>
                <Card className="bg-card border border-border hover:border-muted-foreground/30 transition-all duration-200 rounded-xl cursor-default">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {card.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {card.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {data && (
        <motion.div variants={itemVariants}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Emissões nos últimos {periodoLabel(periodo)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.chart.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  Nenhuma emissão no período selecionado
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.chart}
                      margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                    >
                      <CartesianGrid
                        stroke="#27272a"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#71717a", fontSize: 12 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        minTickGap={24}
                        tickFormatter={(v: string) => {
                          const [, m, d] = v.split("-");
                          return `${d}/${m}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: "#71717a", fontSize: 12 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #27272a",
                          borderRadius: 12,
                          color: "#fafafa",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#a1a1aa" }}
                        labelFormatter={(v: string) => {
                          const [y, m, d] = v.split("-");
                          return `${d}/${m}/${y}`;
                        }}
                      />
                      <Bar
                        dataKey="autorizadas"
                        fill="#10b981"
                        name="Autorizadas"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="rejeitadas"
                        fill="#ef4444"
                        name="Rejeitadas"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Emissions Table */}
      {data && (
        <motion.div variants={itemVariants}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Emissões Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentes.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  Nenhuma emissão no período selecionado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left pb-3 font-medium">Quando</th>
                        <th className="text-left pb-3 font-medium">Serviço</th>
                        <th className="text-left pb-3 font-medium hidden md:table-cell">
                          Empresa
                        </th>
                        <th className="text-left pb-3 font-medium hidden lg:table-cell">
                          Tomador
                        </th>
                        <th className="text-right pb-3 font-medium">Valor</th>
                        <th className="text-center pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentes.map((n) => (
                        <tr
                          key={n.id}
                          onClick={() => router.push(`/nfse/${n.id}`)}
                          className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(n.dataEmissao).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="py-3 max-w-[200px] truncate">
                            {n.descricaoServico}
                          </td>
                          <td className="py-3 hidden md:table-cell text-muted-foreground max-w-[160px] truncate">
                            {n.clienteMeiRazaoSocial}
                          </td>
                          <td className="py-3 hidden lg:table-cell text-muted-foreground max-w-[160px] truncate">
                            {n.tomadorNome}
                          </td>
                          <td className="py-3 text-right tabular-nums whitespace-nowrap">
                            {formatBRL(Number(n.valorServico))}
                          </td>
                          <td className="py-3 text-center">
                            <StatusBadge status={n.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
