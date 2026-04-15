"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, AlertCircle, Receipt } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_CONFIG } from "@/lib/app.config";

const easeOut = "easeOut" as const;
const easeInOut = "easeInOut" as const;

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [need2fa, setNeed2fa] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const emailVal = need2fa ? email : String(formData.get("email") || "");
    const passwordVal = need2fa ? password : String(formData.get("password") || "");
    const otpVal = need2fa ? otp : undefined;

    if (!need2fa) {
      setEmail(emailVal);
      setPassword(passwordVal);
    }

    startTransition(async () => {
      try {
        // Passo 1: se não estiver em passo 2FA, pré-checar.
        if (!need2fa) {
          const resp = await fetch("/api/auth/check-2fa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailVal, password: passwordVal }),
          });
          if (!resp.ok) {
            const msg = "E-mail ou senha inválidos.";
            setError(msg);
            toast.error(msg);
            return;
          }
          const data = await resp.json();
          if (data.needs2fa) {
            setNeed2fa(true);
            toast.info("Digite o código do aplicativo autenticador");
            return;
          }
        }

        const result = await signIn("credentials", {
          email: emailVal,
          password: passwordVal,
          otp: otpVal,
          redirect: false,
        });

        if (result?.error) {
          const msg = need2fa
            ? "Código 2FA inválido"
            : "E-mail ou senha inválidos.";
          setError(msg);
          toast.error(msg);
          return;
        }

        toast.success("Login realizado com sucesso!");
        router.push(callbackUrl);
        router.refresh();
      } catch {
        const msg = "Erro ao entrar. Tente novamente.";
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
      {/* Logo com glow violet */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-5"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 30px rgba(124, 58, 237, 0.15)",
              "0 0 60px rgba(124, 58, 237, 0.3)",
              "0 0 30px rgba(124, 58, 237, 0.15)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: easeInOut }}
          className="flex h-[88px] w-[88px] items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600"
        >
          <Receipt className="h-11 w-11 text-white" strokeWidth={2.25} />
        </motion.div>
      </motion.div>

      {/* Marca */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl font-bold text-white tracking-tight">{APP_CONFIG.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">Emissão de NFe MEI</p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 w-full">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 rounded-xl border border-red-900/50 bg-red-950/30 p-3.5 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {!need2fa && (
          <>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                autoComplete="email"
                autoFocus
                disabled={isPending}
                className="h-12 rounded-xl border-zinc-800 bg-zinc-900/80 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  className="h-12 rounded-xl border-zinc-800 bg-zinc-900/80 pr-11 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {need2fa && (
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium text-zinc-300">
              Código do autenticador (ou backup)
            </Label>
            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={isPending}
              className="h-12 rounded-xl border-zinc-800 bg-zinc-900/80 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-center font-mono text-lg tracking-[0.5em]"
            />
            <button
              type="button"
              onClick={() => {
                setNeed2fa(false);
                setOtp("");
                setError(null);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Voltar
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <a
            href="/forgot-password"
            className="text-sm text-zinc-500 transition-colors hover:text-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded"
            tabIndex={isPending ? -1 : 0}
          >
            Esqueci minha senha
          </a>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm transition-all duration-300 hover:from-violet-500 hover:to-purple-500 hover:shadow-[0_0_24px_rgba(124,58,237,0.4)] disabled:opacity-50 cursor-pointer border-0"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Entrar
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
