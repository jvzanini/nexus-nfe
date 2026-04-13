"use client";

import { useEffect, useState, useTransition } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  MapPin,
  FileDigit,
  Calendar,
  Receipt,
} from "lucide-react";
import { MeiFaturamentoBanner } from "@/components/nfse/mei-faturamento-banner";
import { listarNfses, type NfseListItem } from "@/lib/actions/nfse";
import type { ClienteMeiDetail } from "@/lib/actions/clientes-mei";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TabVisaoGeralProps {
  empresa: ClienteMeiDetail;
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "");
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

const colorMap: Record<string, { bg: string; text: string }> = {
  violet: { bg: "bg-violet-500/10", text: "text-violet-400" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  red: { bg: "bg-red-500/10", text: "text-red-400" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  const colors = colorMap[color];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
        <div>
          <p className="text-lg sm:text-2xl font-bold tabular-nums truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
        {icon}
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-sm break-words">{value}</p>
    </div>
  );
}

export function TabVisaoGeral({ empresa }: TabVisaoGeralProps) {
  const [nfses, setNfses] = useState<NfseListItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await listarNfses(empresa.id);
        if (result.success && result.data) {
          setNfses(result.data);
        }
      } catch (error) {
        console.error("[tab-visao-geral] Erro ao buscar notas:", error);
      }
    });
  }, [empresa.id]);

  const totalNotas = nfses?.length ?? empresa.totalNfses;
  const autorizadas = nfses?.filter((n) => n.status === "autorizada").length ?? 0;
  const rejeitadas = nfses?.filter((n) => n.status === "rejeitada" || n.status === "erro").length ?? 0;

  const faturamento = nfses
    ? nfses
        .filter((n) => n.status === "autorizada")
        .reduce((acc, n) => acc + Number(n.valorServico), 0)
    : 0;

  const fmtCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      {isPending && !nfses ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={FileText}
              label="Notas Emitidas"
              value={totalNotas}
              color="violet"
            />
            <StatCard
              icon={CheckCircle2}
              label="Autorizadas"
              value={autorizadas}
              color="emerald"
            />
            <StatCard
              icon={XCircle}
              label="Rejeitadas"
              value={rejeitadas}
              color="red"
            />
            <StatCard
              icon={DollarSign}
              label="Faturamento"
              value={fmtCurrency(faturamento)}
              color="amber"
            />
          </div>

          {/* Faturamento banner */}
          <MeiFaturamentoBanner clienteMeiId={empresa.id} />

          {/* Info card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide mb-4">
              Dados da Empresa
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {empresa.nomeFantasia && (
                <InfoRow label="Nome Fantasia" value={empresa.nomeFantasia} />
              )}
              {empresa.email && (
                <InfoRow
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="E-mail"
                  value={empresa.email}
                />
              )}
              {empresa.telefone && (
                <InfoRow
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Telefone"
                  value={empresa.telefone}
                />
              )}
              <InfoRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Endereço"
                value={`${empresa.logradouro}, ${empresa.numero}${empresa.complemento ? ` - ${empresa.complemento}` : ""}`}
              />
              <InfoRow
                label="Bairro / CEP"
                value={`${empresa.bairro} — ${formatCep(empresa.cep)}`}
              />
              <InfoRow
                label="Município / UF"
                value={`${empresa.municipioIbge} — ${empresa.uf}`}
              />
              {empresa.codigoServicoPadrao && (
                <InfoRow
                  label="Cód. Serviço Padrão"
                  value={empresa.codigoServicoPadrao}
                />
              )}
              <InfoRow
                icon={<FileDigit className="h-3.5 w-3.5" />}
                label="Série / Último DPS"
                value={`${empresa.serieDpsAtual} / ${empresa.ultimoNumeroDps}`}
              />
              <InfoRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Cadastrado em"
                value={format(empresa.createdAt, "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
