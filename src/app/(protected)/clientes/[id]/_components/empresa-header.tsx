"use client";

import Link from "next/link";
import { Building2, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClienteMeiDetail } from "@/lib/actions/clientes-mei";

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "");
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

interface EmpresaHeaderProps {
  empresa: ClienteMeiDetail;
  onEdit: () => void;
}

export function EmpresaHeader({ empresa, onEdit }: EmpresaHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Link
        href="/clientes"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 w-fit cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para empresas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-muted border border-border/50 flex items-center justify-center">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                {empresa.razaoSocial}
              </h1>
              {empresa.isActive ? (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium">
                  Ativa
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Inativa
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
              {formatCnpj(empresa.cnpj)}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="shrink-0 gap-2 cursor-pointer"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Editar</span>
        </Button>
      </div>
    </div>
  );
}
