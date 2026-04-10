"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/actions/password-reset";

const easeOut = "easeOut" as const;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      const msg = "A senha deve ter ao menos 8 caracteres.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (password !== confirm) {
      const msg = "As senhas não coincidem.";
      setError(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      try {
        const result = await resetPassword(token, password);
        if (result?.error) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success("Senha redefinida com sucesso!");
        router.push("/login");
      } catch {
        const msg = "Erro ao redefinir senha. Tente novamente.";
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
        <h1 className="text-2xl font-bold text-white tracking-tight">Nova senha</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Defina uma nova senha para sua conta.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 w-full">
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-900/50 bg-red-950/30 p-3.5 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
            Nova senha
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              className="h-12 rounded-xl border-zinc-800 bg-zinc-900/80 pr-11 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-sm font-medium text-zinc-300">
            Confirmar senha
          </Label>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isPending}
            className="h-12 rounded-xl border-zinc-800 bg-zinc-900/80 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
          />
        </div>

        <Button
          type="submit"
          disabled={isPending || !token}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-purple-500 hover:shadow-[0_0_24px_rgba(124,58,237,0.4)] border-0"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redefinindo...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" /> Redefinir senha
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
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
