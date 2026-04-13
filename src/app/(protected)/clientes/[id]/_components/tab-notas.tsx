"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, Download, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listarNfses,
  downloadXmlNfse,
  type NfseListItem,
} from "@/lib/actions/nfse";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TabNotasProps {
  empresaId: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  },
  processando: {
    label: "Processando",
    className: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  },
  autorizada: {
    label: "Autorizada",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  rejeitada: {
    label: "Rejeitada",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  erro: {
    label: "Erro",
    className: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
};

export function TabNotas({ empresaId }: TabNotasProps) {
  const router = useRouter();
  const [nfses, setNfses] = useState<NfseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, startDownloading] = useTransition();

  useEffect(() => {
    listarNfses(empresaId).then((result) => {
      if (result.success && result.data) {
        setNfses(result.data);
      }
      setLoading(false);
    });
  }, [empresaId]);

  function handleDownload(id: string) {
    startDownloading(async () => {
      const result = await downloadXmlNfse(id);
      if (result.success && result.data) {
        const blob = new Blob([result.data.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error(result.error || "Erro ao baixar XML");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (nfses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-xl border border-border bg-card">
        <FileText className="h-12 w-12 mb-3 text-muted-foreground/60" />
        <p className="text-sm">Nenhuma nota fiscal emitida</p>
        <p className="text-xs mt-1 mb-4">
          Emita a primeira NFS-e desta empresa
        </p>
        <Link href="/nfse/nova">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
            <Plus className="h-4 w-4" />
            Nova NFS-e
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Número
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Serviço
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tomador
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Valor
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {nfses.map((n) => {
              const status = statusConfig[n.status] ?? {
                label: n.status,
                className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
              };
              return (
                <tr
                  key={n.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/nfse/${n.id}`)}
                >
                  <td className="px-4 py-3 text-foreground font-mono text-xs">
                    {n.serie}-{n.numero}
                  </td>
                  <td className="px-4 py-3 text-foreground max-w-[200px] truncate">
                    {n.descricaoServico}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {n.tomadorNome}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {Number(n.valorServico).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(n.dataEmissao, "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/nfse/${n.id}`}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {(n.status === "autorizada" || n.status === "processando") && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDownload(n.id)}
                          disabled={downloading}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
