"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_CONFIG } from "@/lib/app.config";
import { requestPasswordReset } from "@/lib/actions/password-reset";

const easeOut = "easeOut" as const;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await requestPasswordReset(email);
        if (result?.error) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        setSuccess(true);
        toast.success("Enviamos um link de redefinição para seu e-mail.");
      } catch {
        const msg = "Erro ao enviar e-mail. Tente novamente.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="flex flex-col items-center w-full"
    >
      <div className="mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600 shadow-[0_0_40px_rgba(124,58,237,0.25)]">
        <Receipt className="h-11 w-11 text-white" strokeWidth={2.25} />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Esqueceu a senha?</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Informe seu e-mail e enviaremos um link de redefinição.
        </p>
      </div>

      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex flex-col items-center gap-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-6 text-center"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="text-sm text-emerald-200">
            Se o e-mail existir em nosso sistema, você receberá um link de redefinição em instantes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-900/50 bg-red-950/30 p-3.5 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="h-12 rounded-xl border-zinc-800 bg-zinc-900/80 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-purple-500 hover:shadow-[0_0_24px_rgba(124,58,237,0.4)] border-0"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Enviar link
              </>
            )}
          </Button>

          <div className="flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-violet-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </Link>
          </div>
        </form>
      )}

      <p className="mt-10 text-xs text-zinc-600">{APP_CONFIG.name}</p>
    </motion.div>
  );
}
