"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Hash,
  ClipboardList,
  Shield,
  TrendingUp,
  CircleDot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TutorialPage {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function StepItem({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
        {number}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function StatusItem({
  label,
  color,
  description,
}: {
  label: string;
  color: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${color}`}
      >
        {label}
      </span>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

const pages: TutorialPage[] = [
  {
    icon: <FileText className="h-8 w-8 text-violet-400" />,
    title: "O que e NFS-e?",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          A <strong className="text-foreground">Nota Fiscal de Servico Eletronica</strong> e o
          documento obrigatorio para todo prestador de servico no Brasil. Ela
          substitui a nota fiscal em papel e e emitida digitalmente.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <p className="text-sm text-muted-foreground">
              Documento fiscal obrigatorio para prestadores de servico
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <p className="text-sm text-muted-foreground">
              Substitui completamente a nota em papel
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <p className="text-sm text-muted-foreground">
              Emitida pelo Sistema Nacional NFS-e do gov.br
            </p>
          </div>
        </div>
        <Callout>
          O Nexus cuida de todo o processo tecnico para voce. Basta preencher os
          dados e clicar em emitir.
        </Callout>
      </div>
    ),
  },
  {
    icon: <Hash className="h-8 w-8 text-violet-400" />,
    title: "Serie e Numero",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cada nota fiscal tem uma <strong className="text-foreground">serie</strong> e um{" "}
          <strong className="text-foreground">numero</strong> que juntos formam o identificador
          unico da nota.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Serie</p>
            <p className="text-sm text-muted-foreground">
              Identificador do bloco de notas. Para MEI, o padrao e{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-violet-400">
                00001
              </code>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Numero</p>
            <p className="text-sm text-muted-foreground">
              Sequencial automatico que nunca se repete. Incrementado a cada nova
              nota emitida.
            </p>
          </div>
        </div>
        <Callout>
          O sistema gerencia a serie e o numero automaticamente. Voce nao precisa
          se preocupar com isso.
        </Callout>
      </div>
    ),
  },
  {
    icon: <ClipboardList className="h-8 w-8 text-violet-400" />,
    title: "Como preencher",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          O formulario de emissao e dividido em 5 passos simples:
        </p>
        <StepItem number={1}>
          <strong className="text-foreground">Selecione o cliente MEI</strong> — o prestador do
          servico que esta emitindo a nota.
        </StepItem>
        <StepItem number={2}>
          <strong className="text-foreground">Escolha o servico</strong> — busque o codigo na
          tabela LC 116/2003 e descreva o que foi feito.
        </StepItem>
        <StepItem number={3}>
          <strong className="text-foreground">Dados do tomador</strong> — quem contratou o
          servico (CPF ou CNPJ, nome e email).
        </StepItem>
        <StepItem number={4}>
          <strong className="text-foreground">Valor e aliquota</strong> — informe o valor do
          servico e a aliquota do ISS.
        </StepItem>
        <StepItem number={5}>
          <strong className="text-foreground">Revise e confirme</strong> — confira todos os
          dados antes de emitir.
        </StepItem>
      </div>
    ),
  },
  {
    icon: <Shield className="h-8 w-8 text-violet-400" />,
    title: "Certificado Digital A1",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          O certificado digital A1 e necessario para{" "}
          <strong className="text-foreground">assinar e enviar</strong> a nota fiscal
          eletronicamente ao governo.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <p className="text-sm text-muted-foreground">
              Arquivo <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-violet-400">.pfx</code> com
              validade de 1 ano
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <p className="text-sm text-muted-foreground">
              Faca o upload na pagina do cliente MEI
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <p className="text-sm text-muted-foreground">
              Sem ele, nao e possivel emitir notas
            </p>
          </div>
        </div>
        <Callout>
          O sistema armazena seu certificado de forma segura, criptografado com
          AES-256. Apenas o sistema acessa o certificado no momento da emissao.
        </Callout>
      </div>
    ),
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-violet-400" />,
    title: "Limite Anual MEI",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          O MEI tem um limite de faturamento de{" "}
          <strong className="text-foreground">R$ 81.000 por ano</strong>. O sistema acompanha
          esse valor automaticamente.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-400 font-medium">Ate 80%</span>
            <span className="text-muted-foreground">Situacao normal</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-400 font-medium">80% a 100%</span>
            <span className="text-muted-foreground">Atencao ao limite</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-400 font-medium">100% a 120%</span>
            <span className="text-muted-foreground">Tolerancia (ate R$ 97.200)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-400 font-medium">Acima de 120%</span>
            <span className="text-muted-foreground">Emissao bloqueada</span>
          </div>
        </div>
        <Callout>
          Acima de 120% do limite, o sistema bloqueia a emissao para evitar risco
          de desenquadramento retroativo do MEI.
        </Callout>
      </div>
    ),
  },
  {
    icon: <CircleDot className="h-8 w-8 text-violet-400" />,
    title: "Status da Nota",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Cada nota passa por diferentes estados durante o processo de emissao:
        </p>
        <StatusItem
          label="Rascunho"
          color="border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
          description="Nota criada, ainda nao enviada para o governo."
        />
        <StatusItem
          label="Pendente"
          color="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          description="Na fila para envio ao Sistema Nacional."
        />
        <StatusItem
          label="Processando"
          color="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
          description="Sendo enviada e processada pelo gov.br."
        />
        <StatusItem
          label="Autorizada"
          color="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          description="Aceita pela Receita. Recebe chave de acesso."
        />
        <StatusItem
          label="Rejeitada"
          color="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          description="Recusada pelo governo. Verifique o motivo."
        />
        <StatusItem
          label="Cancelada"
          color="border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
          description="Cancelada apos autorizacao (prazo de ate 24h)."
        />
        <StatusItem
          label="Erro"
          color="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          description="Falha tecnica no envio. Tente novamente."
        />
      </div>
    ),
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const [[currentPage, direction], setPage] = useState([0, 0]);

  const paginate = useCallback((newDirection: number) => {
    setPage(([prev]) => {
      const next = prev + newDirection;
      if (next < 0 || next >= pages.length) return [prev, 0];
      return [next, newDirection];
    });
  }, []);

  function handleOpenChange(value: boolean) {
    if (!value) {
      setPage([0, 0]);
    }
    onOpenChange(value);
  }

  const page = pages[currentPage];
  const isFirst = currentPage === 0;
  const isLast = currentPage === pages.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">Tutorial NFS-e</DialogTitle>
          <DialogDescription className="sr-only">
            Guia passo-a-passo de como emitir uma NFS-e
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[380px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex-1"
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/10 border border-violet-500/20">
                  {page.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground text-center mb-5">
                {page.title}
              </h3>

              {/* Content */}
              <div className="px-1">{page.content}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="!flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => paginate(-1)}
            disabled={isFirst}
            className="gap-1 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPage([idx, idx > currentPage ? 1 : -1])}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentPage
                    ? "w-6 bg-violet-500"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <Button
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="gap-1 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
            >
              Entendi
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => paginate(1)}
              className="gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Proximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
