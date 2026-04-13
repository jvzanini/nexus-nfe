"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { NbsSelector } from "@/components/nfse/nbs-selector";
import { stepServicoSchema } from "@/lib/validation/nfse";
import type { NfseFormData } from "@/components/nfse/nova-nfse-form";
import { listarServicosMemorizados, registrarUsoServico, type ServicoMemorizadoItem } from "@/lib/actions/servicos-memorizados";

interface StepServicoProps {
  data: NfseFormData["servico"];
  clienteMeiId?: string;
  clienteMunicipioIbge?: string;
  onNext: (data: NfseFormData["servico"]) => void;
  onBack: () => void;
}

export function StepServico({
  data,
  clienteMeiId,
  clienteMunicipioIbge,
  onNext,
  onBack,
}: StepServicoProps) {
  const [codigoTributacao, setCodigoTributacao] = useState(
    data?.codigoTributacaoNacional ?? ""
  );
  const [descricao, setDescricao] = useState(data?.descricaoServico ?? "");
  const [codigoNbs, setCodigoNbs] = useState(data?.codigoNbs ?? "");
  const [localIbge, setLocalIbge] = useState(
    data?.localPrestacaoIbge ?? clienteMunicipioIbge ?? ""
  );
  const [descricaoNbs, setDescricaoNbs] = useState(data?.descricaoNbs ?? "");

  const [memorizados, setMemorizados] = useState<ServicoMemorizadoItem[]>([]);
  const [loadingMem, setLoadingMem] = useState(false);

  useEffect(() => {
    if (!clienteMeiId) return;
    setLoadingMem(true);
    listarServicosMemorizados(clienteMeiId).then((r) => {
      if (r.success && r.data) setMemorizados(r.data);
      setLoadingMem(false);
    });
  }, [clienteMeiId]);

  function handleNbsSelect(codigo: string, descricaoNbsItem: string) {
    setCodigoNbs(codigo);
    setDescricaoNbs(descricaoNbsItem);
    // Código NBS usa 6 primeiros dígitos como código de tributação
    if (codigo.length >= 6) {
      setCodigoTributacao(codigo.slice(0, 6));
    }
    if (!descricao) {
      setDescricao(descricaoNbsItem);
    }
  }

  function handleNext() {
    const parsed = stepServicoSchema.safeParse({
      codigoTributacaoNacional: codigoTributacao,
      descricaoServico: descricao,
      codigoNbs: codigoNbs || undefined,
      localPrestacaoIbge: localIbge,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    onNext({
      ...parsed.data,
      descricaoNbs,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Dados do Serviço
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione o código do serviço e descreva a atividade prestada
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Campos marcados com <span className="text-red-500">*</span> são obrigatórios
        </p>
      </div>

      {/* Serviços recentes */}
      {memorizados.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Serviços recentes
          </p>
          <div className="flex flex-wrap gap-2">
            {memorizados.slice(0, 5).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setCodigoTributacao(s.codigoServico);
                  setDescricao(s.descricaoServico);
                  setCodigoNbs(s.codigoNbs ?? "");
                  setLocalIbge(s.localPrestacaoIbge);
                  setDescricaoNbs("");
                  registrarUsoServico(s.id);
                }}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <span className="font-medium text-foreground">{s.apelido}</span>
                <span className="text-xs text-muted-foreground">({s.codigoServico})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NBS Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Código do Serviço (NBS)
        </Label>
        <NbsSelector
          value={codigoNbs}
          onSelect={handleNbsSelect}
          placeholder="Buscar por código ou descrição do serviço..."
        />
      </div>

      {/* Código de Tributação */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Código de Tributação Nacional <span className="text-red-500 ml-0.5">*</span>
        </Label>
        <Input
          value={codigoTributacao}
          onChange={(e) => setCodigoTributacao(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="bg-muted/50 border-border text-foreground font-mono"
          maxLength={6}
        />
        <p className="text-xs text-muted-foreground">
          Preenchido automaticamente ao selecionar o código NBS
        </p>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Descrição do Serviço <span className="text-red-500 ml-0.5">*</span>
        </Label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva o serviço prestado..."
          rows={4}
          className="flex w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {descricao.length}/2000
        </p>
      </div>

      {/* Município de prestação */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Município de Prestação (Código IBGE) <span className="text-red-500 ml-0.5">*</span>
        </Label>
        <Input
          value={localIbge}
          onChange={(e) => setLocalIbge(e.target.value.replace(/\D/g, "").slice(0, 7))}
          placeholder="0000000"
          className="bg-muted/50 border-border text-foreground font-mono"
          maxLength={7}
        />
        {clienteMunicipioIbge && (
          <p className="text-xs text-muted-foreground">
            Pré-preenchido com o município do cliente
          </p>
        )}
      </div>

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
