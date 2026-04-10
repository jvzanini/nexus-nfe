"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Users as UsersIcon,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const easeOut = "easeOut" as const;

type PeriodFilter = "7d" | "30d" | "90d";

interface Stat {
  title: string;
  value: string;
  delta: number;
  icon: LucideIcon;
  accent: string;
}

function generateSeries(days: number) {
  return Array.from({ length: days }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      emissoes: Math.round(20 + Math.sin(i / 3) * 10 + Math.random() * 15),
      valor: Math.round(2500 + Math.cos(i / 4) * 800 + Math.random() * 600),
    };
  });
}

export function DashboardContent() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const series = useMemo(() => generateSeries(days), [days]);

  const stats: Stat[] = [
    {
      title: "NFs emitidas no mês",
      value: "842",
      delta: 12.4,
      icon: FileText,
      accent: "from-violet-500 to-purple-600",
    },
    {
      title: "Clientes ativos",
      value: "218",
      delta: 4.1,
      icon: UsersIcon,
      accent: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Falhas no período",
      value: "7",
      delta: -32.0,
      icon: AlertTriangle,
      accent: "from-amber-500 to-orange-600",
    },
    {
      title: "Valor total emitido",
      value: "R$ 98.420",
      delta: 8.7,
      icon: DollarSign,
      accent: "from-blue-500 to-cyan-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: easeOut }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão geral das emissões de NFe e atividade da plataforma.
          </p>
        </div>

        {/* Filtro de período */}
        <div className="inline-flex items-center rounded-xl border border-border bg-card p-1">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className={`rounded-lg ${period === p ? "" : "text-muted-foreground"}`}
            >
              {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const TrendIcon = stat.delta >= 0 ? TrendingUp : TrendingDown;
          const trendColor = stat.delta >= 0 ? "text-emerald-500" : "text-red-500";
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: easeOut }}
            >
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1.5">{stat.value}</p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} shadow-lg shrink-0`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    <span>{Math.abs(stat.delta).toFixed(1)}%</span>
                    <span className="text-muted-foreground">vs período anterior</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: easeOut }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Emissões nos últimos {days} dias</CardTitle>
            <p className="text-xs text-muted-foreground">
              Quantidade de NFe emitidas por dia (dados mockados).
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="chart1Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--muted-foreground)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="emissoes"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "var(--chart-1)" }}
                    name="Emissões"
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 4"
                    name="Valor (R$)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
