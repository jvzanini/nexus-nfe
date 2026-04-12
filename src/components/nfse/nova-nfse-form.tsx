"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<NfseFormData>({});

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
      <motion.div variants={itemVariants} className="flex items-center gap-3">
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
      </motion.div>

      {/* Step indicator */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
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
                    className={`text-xs font-medium transition-colors ${
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
                    className={`h-0.5 flex-1 mx-2 rounded-full transition-colors ${
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
      </motion.div>

      {/* Step content */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card/50 p-6"
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
            clienteMunicipioIbge={formData.cliente?.municipioIbge}
            onNext={handleStepServico}
            onBack={handleBack}
          />
        )}
        {currentStep === 3 && (
          <StepTomador
            data={formData.tomador}
            onNext={handleStepTomador}
            onBack={handleBack}
          />
        )}
        {currentStep === 4 && (
          <StepValores
            data={formData.valores}
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
    </motion.div>
  );
}
