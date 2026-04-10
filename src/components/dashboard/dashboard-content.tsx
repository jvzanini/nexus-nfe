"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  AlertTriangle,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
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
import { NotificationBell } from "@/components/layout/notification-bell";
import { CustomSelect } from "@/components/ui/custom-select";

interface DashboardContentProps {
  userName: string;
}

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

type PeriodFilter = "7d" | "30d" | "90d";

interface StatCard {
  label: string;
  value: string;
  delta: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  invertTrend?: boolean;
}

function generateSeries(days: number) {
  return Array.from({ length: days }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      emissoes: Math.round(20 + Math.sin(i / 3) * 10 + Math.random() * 15),
    };
  });
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const series = useMemo(() => generateSeries(days), [days]);

  const stats: StatCard[] = [
    {
      label: "NFes Emitidas (mês)",
      value: "842",
      delta: 12.4,
      icon: FileText,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
    },
    {
      label: "Clientes Ativos",
      value: "218",
      delta: 4.1,
      icon: Users,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      label: "Falhas no Período",
      value: "7",
      delta: -32.6,
      icon: AlertTriangle,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
      invertTrend: true,
    },
    {
      label: "Valor Total Emitido",
      value: "R$ 98.420",
      delta: 8.7,
      icon: DollarSign,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
    },
  ];

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Greeting + Bell */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Olá, {userName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <NotificationBell />
      </motion.div>

      {/* Period Filter */}
      <motion.div variants={itemVariants} className="flex items-center justify-end">
        <div className="w-[200px]">
          <CustomSelect
            value={period}
            onChange={(val) => setPeriod(val as PeriodFilter)}
            options={[
              { value: "7d", label: "Últimos 7 dias" },
              { value: "30d", label: "Últimos 30 dias" },
              { value: "90d", label: "Últimos 90 dias" },
            ]}
          />
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((card) => {
          const isPositive = card.delta > 0;
          const isNegative = card.delta < 0;
          const trendIsGood = card.invertTrend ? isNegative : isPositive;
          const trendIsBad = card.invertTrend ? isPositive : isNegative;
          const Icon = card.icon;

          return (
            <motion.div key={card.label} variants={itemVariants}>
              <Card className="bg-card border border-border hover:border-muted-foreground/30 transition-all duration-200 rounded-xl cursor-default">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <span
                        className={
                          trendIsGood
                            ? "text-emerald-400"
                            : trendIsBad
                              ? "text-red-400"
                              : "text-muted-foreground"
                        }
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {isPositive ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : isNegative ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : null}
                          {card.delta > 0 ? "+" : ""}
                          {card.delta.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Chart */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Emissões nos últimos {days} dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
                    stroke="var(--chart-3)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "var(--chart-3)" }}
                    name="Emissões"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
