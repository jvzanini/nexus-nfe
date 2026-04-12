"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Search,
  Loader2,
  ArrowRight,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  listClientesMei,
  type ClienteMeiListItem,
} from "@/lib/actions/clientes-mei";
import type { NfseFormData } from "@/components/nfse/nova-nfse-form";

interface StepClienteProps {
  data: NfseFormData["cliente"];
  onNext: (data: NfseFormData["cliente"]) => void;
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function StepCliente({ data, onNext }: StepClienteProps) {
  const [clientes, setClientes] = useState<ClienteMeiListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    data?.clienteMeiId ?? null
  );

  useEffect(() => {
    async function load() {
      const result = await listClientesMei();
      if (result.success && result.data) {
        setClientes(result.data.filter((c) => c.isActive));
      } else {
        toast.error(result.error || "Erro ao carregar clientes");
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.razaoSocial.toLowerCase().includes(q) ||
      c.cnpj.includes(search.replace(/\D/g, ""))
    );
  });

  function handleNext() {
    const cliente = clientes.find((c) => c.id === selectedId);
    if (!cliente) return;
    onNext({
      clienteMeiId: cliente.id,
      razaoSocial: cliente.razaoSocial,
      cnpj: cliente.cnpj,
      municipioIbge: cliente.municipioIbge,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Selecionar Cliente MEI
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o prestador que emitirá a nota fiscal
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por razão social ou CNPJ..."
          className="pl-9 bg-muted/50 border-border"
        />
      </div>

      {/* Client list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mb-2 text-muted-foreground/60" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer ${
                selectedId === c.id
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 border border-violet-500/20">
                <Building2 className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {c.razaoSocial}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatCnpj(c.cnpj)}
                </p>
              </div>
              <div className="shrink-0">
                {c.certificadoValido ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    Certificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <ShieldOff className="h-3 w-3" />
                    Sem cert.
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleNext}
          disabled={!selectedId}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
