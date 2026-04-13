"use client";

import { useState, useEffect } from "react";
import { getFaturamentoAno, type FaturamentoAnoData } from "@/lib/actions/mei-limite";
import { TrendingUp, AlertTriangle, XOctagon, CheckCircle2 } from "lucide-react";

interface MeiFaturamentoBannerProps {
  clienteMeiId: string;
  valorAdicional?: number;
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

export function MeiFaturamentoBanner({ clienteMeiId, valorAdicional = 0 }: MeiFaturamentoBannerProps) {
  const [data, setData] = useState<FaturamentoAnoData | null>(null);

  useEffect(() => {
    getFaturamentoAno(clienteMeiId).then((r) => {
      if (r.success && r.data) setData(r.data);
    });
  }, [clienteMeiId]);

  if (!data) return null;

  const hasAdicional = valorAdicional > 0;
  const totalProjetado = data.totalEmitido + valorAdicional;
  const percentualProjetado = data.limite > 0 ? (totalProjetado / data.limite) * 100 : 0;

  // Usar faixa projetada para estilização quando há valor adicional
  const faixaEfetiva = hasAdicional
    ? percentualProjetado > 120
      ? "bloqueado"
      : percentualProjetado > 100
        ? "alerta"
        : percentualProjetado > 80
          ? "atencao"
          : "ok"
    : data.faixa;

  const config = faixaConfig[faixaEfetiva];
  const Icon = config.icon;
  const barWidthAtual = Math.min((data.totalEmitido / data.limite) * 100, 100);
  const barWidthAdicional = hasAdicional ? Math.min((valorAdicional / data.limite) * 100, 100 - barWidthAtual) : 0;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
          {hasAdicional ? (
            <>
              {fmt(data.totalEmitido)}
              <span className="text-violet-400"> + {fmt(valorAdicional)}</span>
              {" = "}
              {fmt(totalProjetado)}
              {" / "}
              {fmt(data.limite)}
              {" "}
              ({percentualProjetado.toFixed(1)}%)
            </>
          ) : (
            <>
              {fmt(data.totalEmitido)}
              {" / "}
              {fmt(data.limite)}
              {" "}
              ({data.percentual.toFixed(1)}%)
            </>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        <div
          className={`h-full transition-all duration-500 ${config.barClass} ${hasAdicional ? "rounded-l-full" : "rounded-full"}`}
          style={{ width: `${barWidthAtual}%` }}
        />
        {hasAdicional && (
          <div
            className={`h-full rounded-r-full transition-all duration-500 ${config.barClass} opacity-40`}
            style={{ width: `${barWidthAdicional}%` }}
          />
        )}
      </div>
      {data.faixa !== "ok" && !hasAdicional && (
        <p className={`text-xs mt-2 ${config.textClass}`}>{data.mensagem}</p>
      )}
      {hasAdicional && faixaEfetiva !== "ok" && (
        <p className={`text-xs mt-2 ${config.textClass}`}>
          {faixaEfetiva === "bloqueado"
            ? "Com este valor, o faturamento ultrapassará 120% do limite MEI"
            : faixaEfetiva === "alerta"
              ? "Com este valor, o faturamento ultrapassará o limite MEI"
              : "Com este valor, o faturamento ficará acima de 80% do limite MEI"}
        </p>
      )}
    </div>
  );
}
