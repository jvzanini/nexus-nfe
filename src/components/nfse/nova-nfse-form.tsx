"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, CircleHelp } from "lucide-react";
import { TutorialDialog } from "@/components/nfse/tutorial-dialog";
import { getNfseDetail } from "@/lib/actions/nfse";
import { StepCliente } from "@/components/nfse/step-cliente";
import { StepServico } from "@/components/nfse/step-servico";
import { StepTomador } from "@/components/nfse/step-tomador";
import { StepValores } from "@/components/nfse/step-valores";
import { StepConfirmar } from "@/components/nfse/step-confirmar";
import type {
  StepClienteInput,
  StepServicoInput,
  StepTomadorInput,
  StepValoresInput,
} from "@/lib/validation/nfse";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

const STEPS = [
  { label: "Cliente", number: 1 },
  { label: "Serviço", number: 2 },
  { label: "Tomador", number: 3 },
  { label: "Valores", number: 4 },
  { label: "Confirmar", number: 5 },
];

export interface NfseFormData {
  cliente?: StepClienteInput & { razaoSocial?: string; cnpj?: string; municipioIbge?: string };
  servico?: StepServicoInput & { descricaoNbs?: string };
  tomador?: StepTomadorInput;
  valores?: StepValoresInput;
}

export function NovaNfseForm() {
  const searchParams = useSearchParams();
  const reemitirId = searchParams.get("reemitir");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<NfseFormData>({});
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (!reemitirId) return;
    getNfseDetail(reemitirId).then((r) => {
      if (!r.success || !r.data) return;
      const n = r.data;
      setFormData({
        cliente: {
          clienteMeiId: n.clienteMeiId,
          razaoSocial: n.clienteMeiRazaoSocial,
          cnpj: n.clienteMeiCnpj,
          municipioIbge: n.clienteMeiMunicipioIbge,
        },
        servico: {
          codigoTributacaoNacional: n.codigoServico,
          descricaoServico: n.descricaoServico,
          codigoNbs: n.codigoNbs || "",
          localPrestacaoIbge: n.localPrestacaoIbge,
        },
        tomador: {
          tomadorTipo: n.tomadorTipo.toLowerCase() as "cpf" | "cnpj",
          tomadorDocumento: n.tomadorDocumento,
          tomadorNome: n.tomadorNome,
          tomadorEmail: n.tomadorEmail || "",
        },
        valores: {
          valorServico: parseFloat(n.valorServico),
          aliquotaIss: parseFloat(n.aliquotaIss),
          tributacaoIssqn: 1,
        },
      });
      setCurrentStep(5);
    });
  }, [reemitirId]);

  function handleStepCliente(data: NfseFormData["cliente"]) {
    setFormData((prev) => ({ ...prev, cliente: data }));
    setCurrentStep(2);
  }

  function handleStepServico(data: NfseFormData["servico"]) {
    setFormData((prev) => ({ ...prev, servico: data }));
    setCurrentStep(3);
  }

  function handleStepTomador(data: NfseFormData["tomador"]) {
    setFormData((prev) => ({ ...prev, tomador: data }));
    setCurrentStep(4);
  }

  function handleStepValores(data: NfseFormData["valores"]) {
    setFormData((prev) => ({ ...prev, valores: data }));
    setCurrentStep(5);
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/nfse">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Nova NFS-e</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados para emitir uma nota fiscal de serviço
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTutorialOpen(true)}
          className="cursor-pointer"
          title="Como funciona?"
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Step indicator */}
      <motion.div variants={itemVariants}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between min-w-[320px]">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
                      isCompleted
                        ? "border-violet-500 bg-violet-600 text-white"
                        : isActive
                          ? "border-violet-500 bg-violet-600/20 text-violet-400"
                          : "border-border bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium transition-colors ${
                      isActive || isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 sm:mx-2 rounded-full transition-colors ${
                      currentStep > step.number
                        ? "bg-violet-500"
                        : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        </div>
      </motion.div>

      {/* Step content */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card/50 p-4 sm:p-6"
      >
        {currentStep === 1 && (
          <StepCliente
            data={formData.cliente}
            onNext={handleStepCliente}
          />
        )}
        {currentStep === 2 && (
          <StepServico
            data={formData.servico}
            clienteMeiId={formData.cliente?.clienteMeiId}
            clienteMunicipioIbge={formData.cliente?.municipioIbge}
            onNext={handleStepServico}
            onBack={handleBack}
          />
        )}
        {currentStep === 3 && (
          <StepTomador
            data={formData.tomador}
            clienteMeiId={formData.cliente?.clienteMeiId}
            onNext={handleStepTomador}
            onBack={handleBack}
          />
        )}
        {currentStep === 4 && (
          <StepValores
            data={formData.valores}
            clienteMeiId={formData.cliente?.clienteMeiId}
            clienteMunicipioIbge={formData.cliente?.municipioIbge}
            codigoServico={formData.servico?.codigoTributacaoNacional}
            onNext={handleStepValores}
            onBack={handleBack}
          />
        )}
        {currentStep === 5 && (
          <StepConfirmar
            formData={formData}
            onBack={handleBack}
          />
        )}
      </motion.div>

      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </motion.div>
  );
}
