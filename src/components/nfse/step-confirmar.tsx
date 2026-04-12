"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  FileText,
  User,
  Calculator,
  Loader2,
  Check,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { criarRascunhoNfse } from "@/lib/actions/nfse";
import type { NfseFormData } from "@/components/nfse/nova-nfse-form";

interface StepConfirmarProps {
  formData: NfseFormData;
  onBack: () => void;
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatDoc(doc: string, tipo: string) {
  const digits = doc.replace(/\D/g, "");
  return tipo === "cpf" ? formatCpf(digits) : formatCnpj(digits);
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-violet-400" />
        {title}
      </div>
      <div className="grid gap-2 pl-6">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function StepConfirmar({ formData, onBack }: StepConfirmarProps) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  const { cliente, servico, tomador, valores } = formData;
  const valorServico = valores?.valorServico ?? 0;
  const aliquota = valores?.aliquotaIss ?? 0;
  const valorIss = valorServico * aliquota / 100;

  function handleSalvarRascunho() {
    if (!cliente || !servico || !tomador || !valores) {
      toast.error("Dados incompletos. Volte e preencha todas as etapas.");
      return;
    }

    startSaving(async () => {
      const result = await criarRascunhoNfse({
        clienteMeiId: cliente.clienteMeiId,
        codigoTributacaoNacional: servico.codigoTributacaoNacional,
        descricaoServico: servico.descricaoServico,
        codigoNbs: servico.codigoNbs || undefined,
        localPrestacaoIbge: servico.localPrestacaoIbge,
        tomadorTipo: tomador.tomadorTipo,
        tomadorDocumento: tomador.tomadorDocumento,
        tomadorNome: tomador.tomadorNome,
        tomadorEmail: tomador.tomadorEmail || undefined,
        tomadorCep: tomador.tomadorCep || undefined,
        tomadorLogradouro: tomador.tomadorLogradouro || undefined,
        tomadorNumero: tomador.tomadorNumero || undefined,
        tomadorComplemento: tomador.tomadorComplemento || undefined,
        tomadorBairro: tomador.tomadorBairro || undefined,
        tomadorMunicipioIbge: tomador.tomadorMunicipioIbge || undefined,
        valorServico: valores.valorServico,
        aliquotaIss: valores.aliquotaIss,
        tributacaoIssqn: valores.tributacaoIssqn,
      });

      if (result.success) {
        toast.success("Rascunho de NFS-e criado com sucesso");
        router.push("/nfse");
      } else {
        toast.error(result.error || "Erro ao criar rascunho");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Confirmar Dados
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revise os dados antes de salvar o rascunho da NFS-e
        </p>
      </div>

      <div className="space-y-6 rounded-lg border border-border bg-muted/20 p-5">
        {/* Cliente */}
        <Section icon={Building2} title="Cliente MEI">
          <Field label="Razão social" value={cliente?.razaoSocial} />
          <Field
            label="CNPJ"
            value={cliente?.cnpj ? formatCnpj(cliente.cnpj) : undefined}
          />
        </Section>

        {/* Serviço */}
        <div className="border-t border-border" />
        <Section icon={FileText} title="Serviço">
          <Field
            label="Código de tributação"
            value={servico?.codigoTributacaoNacional}
          />
          {servico?.codigoNbs && (
            <Field label="Código NBS" value={servico.codigoNbs} />
          )}
          <Field label="Descrição" value={servico?.descricaoServico} />
          <Field
            label="Município (IBGE)"
            value={servico?.localPrestacaoIbge}
          />
        </Section>

        {/* Tomador */}
        <div className="border-t border-border" />
        <Section icon={User} title="Tomador">
          <Field label="Nome" value={tomador?.tomadorNome} />
          <Field
            label={tomador?.tomadorTipo === "cpf" ? "CPF" : "CNPJ"}
            value={
              tomador?.tomadorDocumento
                ? formatDoc(tomador.tomadorDocumento, tomador.tomadorTipo)
                : undefined
            }
          />
          {tomador?.tomadorEmail && (
            <Field label="E-mail" value={tomador.tomadorEmail} />
          )}
        </Section>

        {/* Valores */}
        <div className="border-t border-border" />
        <Section icon={Calculator} title="Valores">
          <Field label="Valor do serviço" value={formatCurrency(valorServico)} />
          <Field label="Alíquota ISS" value={`${aliquota}%`} />
          <Field label="Valor ISS" value={formatCurrency(valorIss)} />
          <div className="flex items-baseline gap-2 text-sm font-semibold">
            <span className="text-muted-foreground shrink-0">
              Valor líquido:
            </span>
            <span className="text-violet-400">
              {formatCurrency(valorServico - valorIss)}
            </span>
          </div>
        </Section>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={saving}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled
            className="gap-2 opacity-50 cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            Emitir NFS-e (Fase 3)
          </Button>
          <Button
            onClick={handleSalvarRascunho}
            disabled={saving}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Salvar Rascunho
          </Button>
        </div>
      </div>
    </div>
  );
}
