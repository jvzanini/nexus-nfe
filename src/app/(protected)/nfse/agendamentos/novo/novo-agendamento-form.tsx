"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarClock,
  ChevronLeft,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";
import { criarAgendamento } from "@/lib/actions/nfse-agendamentos";

interface EmpresaOption {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

export function NovoAgendamentoForm({ empresas }: { empresas: EmpresaOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clienteMeiId, setClienteMeiId] = useState("");
  const [nome, setNome] = useState("");
  const [frequencia, setFrequencia] = useState("mensal");
  const [proximaExecucao, setProximaExecucao] = useState("");
  const [diaMes, setDiaMes] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [maxExecucoes, setMaxExecucoes] = useState("");

  const [codigoTributacao, setCodigoTributacao] = useState("");
  const [codigoNbs, setCodigoNbs] = useState("");
  const [localIbge, setLocalIbge] = useState("");
  const [aliquota, setAliquota] = useState("5");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  const [tomadorTipo, setTomadorTipo] = useState<"cpf" | "cnpj">("cpf");
  const [tomadorDoc, setTomadorDoc] = useState("");
  const [tomadorNome, setTomadorNome] = useState("");
  const [tomadorEmail, setTomadorEmail] = useState("");

  const empresaOptions = empresas.map((e) => ({
    value: e.id,
    label: e.razaoSocial,
    description: e.cnpj,
  }));

  const frequenciaOptions = [
    { value: "unica", label: "Única" },
    { value: "mensal", label: "Mensal" },
    { value: "bimestral", label: "Bimestral" },
    { value: "trimestral", label: "Trimestral" },
    { value: "semestral", label: "Semestral" },
    { value: "anual", label: "Anual" },
  ];

  function handleSubmit() {
    if (!clienteMeiId || !nome || !proximaExecucao || !descricao || !valor || !tomadorDoc || !tomadorNome) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    startTransition(async () => {
      const r = await criarAgendamento({
        clienteMeiId,
        nome,
        frequencia: frequencia as any,
        proximaExecucao: new Date(proximaExecucao).toISOString(),
        diaMes: diaMes ? Number(diaMes) : null,
        dataFinal: dataFinal || null,
        maxExecucoes: maxExecucoes ? Number(maxExecucoes) : null,
        codigoTributacaoNacional: codigoTributacao,
        codigoNbs: codigoNbs || undefined,
        localPrestacaoIbge: localIbge,
        aliquotaIss: Number(aliquota.replace(",", ".")) || 0,
        descricaoServico: descricao,
        valorServico: Number(valor.replace(/\./g, "").replace(",", ".")) || 0,
        tributacaoIssqn: 1,
        tomadorTipo,
        tomadorDocumento: tomadorDoc,
        tomadorNome,
        tomadorEmail: tomadorEmail || undefined,
      });
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Erro ao criar agendamento");
        return;
      }
      toast.success("Agendamento criado");
      router.push(`/nfse/agendamentos/${r.data.id}`);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <Link href="/nfse/agendamentos">
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Novo agendamento</h1>
            <p className="text-xs text-muted-foreground">
              Emissão automática recorrente
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Coluna 1 — Cronograma */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Cronograma</h2>
          <div className="space-y-1">
            <Label>Empresa emitente *</Label>
            <CustomSelect
              value={clienteMeiId}
              onChange={setClienteMeiId}
              options={empresaOptions}
              placeholder="Selecione"
            />
          </div>
          <div className="space-y-1">
            <Label>Nome do agendamento *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Aluguel cliente X"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Frequência *</Label>
              <CustomSelect
                value={frequencia}
                onChange={setFrequencia}
                options={frequenciaOptions}
              />
            </div>
            <div className="space-y-1">
              <Label>Dia do mês (opcional)</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={diaMes}
                onChange={(e) => setDiaMes(e.target.value)}
                placeholder="1-28"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Próxima execução *</Label>
            <Input
              type="datetime-local"
              value={proximaExecucao}
              onChange={(e) => setProximaExecucao(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data final (opcional)</Label>
              <Input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Máx. execuções (opcional)</Label>
              <Input
                type="number"
                min={1}
                value={maxExecucoes}
                onChange={(e) => setMaxExecucoes(e.target.value)}
                placeholder="Ex: 12"
              />
            </div>
          </div>
        </div>

        {/* Coluna 2 — Serviço e tomador */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Serviço e tomador</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Código tributação *</Label>
              <Input
                value={codigoTributacao}
                onChange={(e) => setCodigoTributacao(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Código NBS</Label>
              <Input value={codigoNbs} onChange={(e) => setCodigoNbs(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Local prestação (IBGE) *</Label>
              <Input
                value={localIbge}
                onChange={(e) => setLocalIbge(e.target.value)}
                maxLength={7}
              />
            </div>
            <div className="space-y-1">
              <Label>Alíquota ISS (%)</Label>
              <Input value={aliquota} onChange={(e) => setAliquota(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do serviço"
            />
          </div>
          <div className="space-y-1">
            <Label>Valor do serviço (R$) *</Label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Tipo doc</Label>
              <CustomSelect
                value={tomadorTipo}
                onChange={(v) => setTomadorTipo(v as any)}
                options={[
                  { value: "cpf", label: "CPF" },
                  { value: "cnpj", label: "CNPJ" },
                ]}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Documento tomador *</Label>
              <Input value={tomadorDoc} onChange={(e) => setTomadorDoc(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nome tomador *</Label>
            <Input
              value={tomadorNome}
              onChange={(e) => setTomadorNome(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>E-mail tomador</Label>
            <Input
              value={tomadorEmail}
              onChange={(e) => setTomadorEmail(e.target.value)}
              placeholder="opcional"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Criar agendamento
        </Button>
      </div>
    </motion.div>
  );
}
