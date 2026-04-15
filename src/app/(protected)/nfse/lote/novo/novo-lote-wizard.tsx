"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileStack,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";
import {
  previewLoteCsv,
  criarLote,
} from "@/lib/actions/nfse-lote";
import type { LotePreviewResult } from "@/lib/nfse-lote/preview";

interface EmpresaOption {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

type Step = 1 | 2 | 3;

export function NovoLoteWizard({ empresas }: { empresas: EmpresaOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();

  const [clienteMeiId, setClienteMeiId] = useState<string>("");
  const [codigoTributacao, setCodigoTributacao] = useState("");
  const [codigoNbs, setCodigoNbs] = useState("");
  const [localIbge, setLocalIbge] = useState("");
  const [aliquota, setAliquota] = useState("5");
  const [descricaoPadrao, setDescricaoPadrao] = useState("");

  const [csvText, setCsvText] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<LotePreviewResult | null>(null);
  const [previewTab, setPreviewTab] = useState<"validos" | "invalidos">("validos");

  function servicoPadraoInput() {
    return {
      codigoTributacaoNacional: codigoTributacao.trim(),
      codigoNbs: codigoNbs.trim() || undefined,
      localPrestacaoIbge: localIbge.trim(),
      aliquotaIss: Number(aliquota.replace(",", ".")) || 0,
      descricaoServico: descricaoPadrao.trim(),
      tributacaoIssqn: 1,
    };
  }

  function podeAvancarStep1(): boolean {
    return (
      !!clienteMeiId &&
      !!codigoTributacao.trim() &&
      /^\d{7}$/.test(localIbge.trim().replace(/\D/g, "")) &&
      !!descricaoPadrao.trim() &&
      descricaoPadrao.trim().length >= 5 &&
      Number(aliquota.replace(",", ".")) >= 0
    );
  }

  function handleFile(file: File) {
    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
    };
    reader.readAsText(file, "UTF-8");
  }

  function runPreview() {
    startTransition(async () => {
      const r = await previewLoteCsv({
        clienteMeiId,
        servicoPadrao: servicoPadraoInput(),
        csvText,
      });
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Erro ao analisar CSV");
        return;
      }
      setPreview(r.data);
      setStep(3);
    });
  }

  function handleCriar() {
    if (!preview) return;
    startTransition(async () => {
      const r = await criarLote({
        clienteMeiId,
        servicoPadrao: servicoPadraoInput(),
        csvText,
        nomeArquivo: nomeArquivo ?? undefined,
      });
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Erro ao criar lote");
        return;
      }
      toast.success(`Lote criado com ${r.data.totalCriados} itens`);
      router.push(`/nfse/lote/${r.data.loteId}`);
    });
  }

  const empresaOptions = empresas.map((e) => ({
    value: e.id,
    label: e.razaoSocial,
    description: e.cnpj,
  }));

  const bloqueios = preview?.bloqueios ?? [];
  const podeCriar = preview && preview.validos.length > 0 && bloqueios.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/nfse/lote">
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600 shadow-[0_0_12px_rgba(124,58,237,0.3)]">
            <FileStack className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Novo lote de NFS-e</h1>
            <p className="text-xs text-muted-foreground">
              Passo {step} de 3
            </p>
          </div>
        </div>
      </div>

      {/* Steps bar */}
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              step >= (n as Step) ? "bg-violet-500" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <h2 className="text-base font-semibold">Empresa e serviço padrão</h2>
          <div className="space-y-1">
            <Label>Empresa emitente</Label>
            <CustomSelect
              value={clienteMeiId}
              onChange={setClienteMeiId}
              options={empresaOptions}
              placeholder="Selecione a empresa"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Código tributação nacional</Label>
              <Input
                value={codigoTributacao}
                onChange={(e) => setCodigoTributacao(e.target.value)}
                placeholder="Ex: 101010100"
              />
            </div>
            <div className="space-y-1">
              <Label>Código NBS (opcional)</Label>
              <Input
                value={codigoNbs}
                onChange={(e) => setCodigoNbs(e.target.value)}
                placeholder="Ex: 101010100"
              />
            </div>
            <div className="space-y-1">
              <Label>Local prestação (IBGE)</Label>
              <Input
                value={localIbge}
                onChange={(e) => setLocalIbge(e.target.value)}
                placeholder="7 dígitos"
                maxLength={7}
              />
            </div>
            <div className="space-y-1">
              <Label>Alíquota ISS (%)</Label>
              <Input
                value={aliquota}
                onChange={(e) => setAliquota(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição padrão do serviço</Label>
            <Input
              value={descricaoPadrao}
              onChange={(e) => setDescricaoPadrao(e.target.value)}
              placeholder="Descrição que será usada quando a linha do CSV não tiver descrição"
            />
            <p className="text-xs text-muted-foreground">
              Cada linha do CSV pode sobrescrever com o campo{" "}
              <code className="text-violet-500">descricao_servico</code>.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
              disabled={!podeAvancarStep1()}
              onClick={() => setStep(2)}
            >
              Continuar <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold">Upload do CSV</h2>
            <a
              href="/templates/nfse-lote-exemplo.csv"
              download
              className="inline-flex items-center gap-2 text-xs text-violet-500 hover:text-violet-400"
            >
              <Download className="h-4 w-4" /> Baixar template
            </a>
          </div>

          <div
            className="rounded-xl border-2 border-dashed border-border/80 py-10 text-center cursor-pointer hover:border-violet-500/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm">
              Arraste o CSV aqui ou clique para selecionar
            </p>
            {nomeArquivo && (
              <p className="mt-2 text-xs text-violet-500">
                {nomeArquivo}
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          <div className="space-y-1">
            <Label>Ou cole o conteúdo do CSV</Label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono min-h-[160px]"
              placeholder="documento;nome;valor_servico..."
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {csvText ? `${csvText.split(/\r?\n/).filter(Boolean).length - 1} linhas detectadas` : "Nenhum conteúdo"}
          </p>

          <div className="flex justify-between">
            <Button variant="outline" className="cursor-pointer" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
              disabled={!csvText.trim() || isPending}
              onClick={runPreview}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Analisar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3 */}
      {step === 3 && preview && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Resumo */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Itens válidos</p>
              <p className="text-2xl font-bold text-emerald-500">
                {preview.validos.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold">
                R${" "}
                {preview.totalValor.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">ISS estimado</p>
              <p className="text-2xl font-bold">
                R${" "}
                {preview.totalIss.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Bloqueios */}
          {bloqueios.length > 0 && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-semibold">Não é possível criar o lote</p>
              </div>
              <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                {bloqueios.map((b, i) => (
                  <li key={i}>{b.mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setPreviewTab("validos")}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                previewTab === "validos"
                  ? "border-violet-500 bg-violet-500/10 text-violet-500"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Válidos ({preview.validos.length})
            </button>
            <button
              onClick={() => setPreviewTab("invalidos")}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                previewTab === "invalidos"
                  ? "border-violet-500 bg-violet-500/10 text-violet-500"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Inválidos ({preview.invalidos.length})
            </button>
            <span className="ml-auto inline-flex items-center text-xs text-muted-foreground">
              {preview.duplicadosPlanilha} duplicados ignorados
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {previewTab === "validos" ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Linha</th>
                    <th className="text-left px-3 py-2">Documento</th>
                    <th className="text-left px-3 py-2">Tomador</th>
                    <th className="text-right px-3 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.validos.slice(0, 50).map((v) => (
                    <tr key={v.linha} className="border-t border-border/60">
                      <td className="px-3 py-2">{v.linha}</td>
                      <td className="px-3 py-2 font-mono text-xs">{v.documento}</td>
                      <td className="px-3 py-2">{v.nome}</td>
                      <td className="px-3 py-2 text-right">
                        R${" "}
                        {v.valorServico.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Linha</th>
                    <th className="text-left px-3 py-2">Motivo</th>
                    <th className="text-left px-3 py-2">Conteúdo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.invalidos.slice(0, 50).map((i) => (
                    <tr key={i.linha} className="border-t border-border/60">
                      <td className="px-3 py-2">{i.linha}</td>
                      <td className="px-3 py-2 text-red-500">{i.motivo}</td>
                      <td className="px-3 py-2 font-mono text-xs truncate max-w-[400px]">
                        {i.raw}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" className="cursor-pointer" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
              disabled={!podeCriar || isPending}
              onClick={handleCriar}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Criar lote com {preview.validos.length} itens
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
