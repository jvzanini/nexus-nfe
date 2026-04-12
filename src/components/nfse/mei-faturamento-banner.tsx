"use client";

import { useState, useEffect } from "react";
import { getFaturamentoAno, type FaturamentoAnoData } from "@/lib/actions/mei-limite";
import { TrendingUp, AlertTriangle, XOctagon, CheckCircle2 } from "lucide-react";

interface MeiFaturamentoBannerProps {
  clienteMeiId: string;
}

const faixaConfig = {
  ok: {
    icon: CheckCircle2,
    bgClass: "bg-emerald-500/10 border-emerald-500/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
    barClass: "bg-emerald-500",
  },
  atencao: {
    icon: TrendingUp,
    bgClass: "bg-amber-500/10 border-amber-500/30",
    textClass: "text-amber-600 dark:text-amber-400",
    barClass: "bg-amber-500",
  },
  alerta: {
    icon: AlertTriangle,
    bgClass: "bg-orange-500/10 border-orange-500/30",
    textClass: "text-orange-600 dark:text-orange-400",
    barClass: "bg-orange-500",
  },
  bloqueado: {
    icon: XOctagon,
    bgClass: "bg-red-500/10 border-red-500/30",
    textClass: "text-red-600 dark:text-red-400",
    barClass: "bg-red-500",
  },
};

export function MeiFaturamentoBanner({ clienteMeiId }: MeiFaturamentoBannerProps) {
  const [data, setData] = useState<FaturamentoAnoData | null>(null);

  useEffect(() => {
    getFaturamentoAno(clienteMeiId).then((r) => {
      if (r.success && r.data) setData(r.data);
    });
  }, [clienteMeiId]);

  if (!data) return null;

  const config = faixaConfig[data.faixa];
  const Icon = config.icon;
  const barWidth = Math.min(data.percentual, 120);

  return (
    <div className={`rounded-lg border p-4 ${config.bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.textClass}`} />
          <span className={`text-sm font-medium ${config.textClass}`}>
            Faturamento {data.ano}
          </span>
        </div>
        <span className={`text-sm font-bold ${config.textClass}`}>
          {data.totalEmitido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          {" / "}
          {data.limite.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          {" "}
          ({data.percentual.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.barClass}`}
          style={{ width: `${Math.min(barWidth, 100)}%` }}
        />
      </div>
      {data.faixa !== "ok" && (
        <p className={`text-xs mt-2 ${config.textClass}`}>{data.mensagem}</p>
      )}
    </div>
  );
}
