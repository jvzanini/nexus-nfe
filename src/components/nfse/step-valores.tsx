"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { stepValoresSchema } from "@/lib/validation/nfse";
import { fetchParametrosServico } from "@/lib/actions/parametros-municipais";
import type { NfseFormData } from "@/components/nfse/nova-nfse-form";

interface StepValoresProps {
  data: NfseFormData["valores"];
  clienteMunicipioIbge?: string;
  codigoServico?: string;
  onNext: (data: NfseFormData["valores"]) => void;
  onBack: () => void;
}

function formatBRL(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRL(formatted: string): number {
  const clean = formatted.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function StepValores({
  data,
  clienteMunicipioIbge,
  codigoServico,
  onNext,
  onBack,
}: StepValoresProps) {
  const [valorStr, setValorStr] = useState(
    data?.valorServico ? data.valorServico.toFixed(2).replace(".", ",") : ""
  );
  const [aliquotaStr, setAliquotaStr] = useState(
    data?.aliquotaIss !== undefined ? String(data.aliquotaIss) : ""
  );
  const [loadingParams, setLoadingParams] = useState(false);

  const valor = parseBRL(valorStr);
  const aliquota = parseFloat(aliquotaStr) || 0;
  const valorIss = valor * aliquota / 100;
  const valorLiquido = valor - valorIss;

  // Auto-suggest alíquota baseada nos parâmetros municipais
  useEffect(() => {
    if (data?.aliquotaIss !== undefined) return; // Já tem valor
    if (!clienteMunicipioIbge || !codigoServico) return;

    async function loadParams() {
      setLoadingParams(true);
      const result = await fetchParametrosServico(
        clienteMunicipioIbge!,
        codigoServico!
      );
      if (result.success && result.data) {
        const aliq = result.data.aliquota;
        if (aliq !== undefined && aliq !== null) {
          setAliquotaStr(String(aliq));
        }
      }
      setLoadingParams(false);
    }
    loadParams();
  }, [clienteMunicipioIbge, codigoServico, data?.aliquotaIss]);

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setValorStr("");
      return;
    }
    setValorStr(formatBRL(raw));
  }

  function handleNext() {
    const parsed = stepValoresSchema.safeParse({
      valorServico: valor,
      aliquotaIss: aliquota,
      tributacaoIssqn: 1,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    onNext(parsed.data);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Valores</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informe o valor do serviço e a alíquota do ISS
        </p>
      </div>

      {/* Valor do serviço */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Valor do Serviço (R$)
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            R$
          </span>
          <Input
            value={valorStr}
            onChange={handleValorChange}
            placeholder="0,00"
            className="pl-10 bg-muted/50 border-border text-foreground font-mono text-right"
          />
        </div>
      </div>

      {/* Alíquota ISS */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Alíquota ISS (%)
          {loadingParams && (
            <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin" />
          )}
        </Label>
        <div className="relative">
          <Input
            value={aliquotaStr}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
              setAliquotaStr(v);
            }}
            placeholder="0.00"
            className="pr-8 bg-muted/50 border-border text-foreground font-mono text-right"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        </div>
        {clienteMunicipioIbge && codigoServico && !loadingParams && (
          <p className="text-xs text-muted-foreground">
            Sugerido com base nos parâmetros municipais
          </p>
        )}
      </div>

      {/* Resumo de valores */}
      {valor > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <Calculator className="h-4 w-4 text-violet-400" />
            Resumo dos Valores
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor bruto</span>
            <span className="text-foreground font-mono">
              {valor.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              ISS ({aliquota}%)
            </span>
            <span className="text-foreground font-mono">
              {valorIss.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
            <span className="text-foreground">Valor líquido</span>
            <span className="text-violet-400 font-mono">
              {valorLiquido.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
