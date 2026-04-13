"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type ActionResult<T = unknown> = { success: boolean; data?: T; error?: string };

export interface DashboardStats {
  totalEmitidas: number;
  totalAutorizadas: number;
  totalFalhas: number;
  valorTotalEmitido: number;
  empresasAtivas: number;
}

export interface DashboardChartPoint {
  date: string;
  autorizadas: number;
  rejeitadas: number;
}

export interface DashboardData {
  stats: DashboardStats;
  chart: DashboardChartPoint[];
  recentes: Array<{
    id: string;
    serie: string;
    numero: string;
    status: string;
    descricaoServico: string;
    valorServico: string;
    tomadorNome: string;
    clienteMeiRazaoSocial: string;
    dataEmissao: Date;
  }>;
  empresas: Array<{
    id: string;
    nome: string;
  }>;
}

export async function getDashboardData(
  periodo: "hoje" | "7dias" | "30dias" = "30dias",
  clienteMeiId?: string
): Promise<ActionResult<DashboardData>> {
  try {
    await requireRole("admin");

    const now = new Date();
    let startDate: Date;
    if (periodo === "hoje") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodo === "7dias") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [nfses, empresasCount, empresas] = await Promise.all([
      prisma.nfse.findMany({
        where: {
          dataEmissao: { gte: startDate },
          ...(clienteMeiId ? { clienteMeiId } : {}),
        },
        select: {
          id: true,
          serie: true,
          numero: true,
          status: true,
          descricaoServico: true,
          valorServico: true,
          tomadorNome: true,
          dataEmissao: true,
          clienteMei: { select: { id: true, razaoSocial: true } },
        },
        orderBy: { dataEmissao: "desc" },
      }),
      prisma.clienteMei.count({
        where: { isActive: true },
      }),
      prisma.clienteMei.findMany({
        where: { isActive: true },
        select: { id: true, razaoSocial: true },
        orderBy: { razaoSocial: "asc" },
      }),
    ]);

    const autorizadas = nfses.filter((n) => n.status === "autorizada");
    const falhas = nfses.filter((n) =>
      ["rejeitada", "erro"].includes(n.status)
    );
    const valorTotal = autorizadas.reduce(
      (sum, n) => sum + Number(n.valorServico),
      0
    );

    // Build chart data — group by date
    const chartMap = new Map<
      string,
      { autorizadas: number; rejeitadas: number }
    >();
    for (const n of nfses) {
      const dateKey = n.dataEmissao.toISOString().slice(0, 10);
      if (!chartMap.has(dateKey))
        chartMap.set(dateKey, { autorizadas: 0, rejeitadas: 0 });
      const entry = chartMap.get(dateKey)!;
      if (n.status === "autorizada") entry.autorizadas++;
      if (["rejeitada", "erro"].includes(n.status)) entry.rejeitadas++;
    }

    const chart = Array.from(chartMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        stats: {
          totalEmitidas: nfses.length,
          totalAutorizadas: autorizadas.length,
          totalFalhas: falhas.length,
          valorTotalEmitido: valorTotal,
          empresasAtivas: empresasCount,
        },
        chart,
        recentes: nfses.slice(0, 10).map((n) => ({
          id: n.id,
          serie: n.serie,
          numero: n.numero,
          status: n.status,
          descricaoServico: n.descricaoServico,
          valorServico: n.valorServico.toString(),
          tomadorNome: n.tomadorNome,
          clienteMeiRazaoSocial: n.clienteMei.razaoSocial,
          dataEmissao: n.dataEmissao,
        })),
        empresas: empresas.map((empresa) => ({
          id: empresa.id,
          nome: empresa.razaoSocial,
        })),
      },
    };
  } catch (error) {
    console.error("[dashboard.getDashboardData]", error);
    return { success: false, error: "Erro ao carregar dashboard" };
  }
}
