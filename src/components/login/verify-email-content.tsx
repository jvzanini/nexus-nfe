"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Receipt, XCircle } from "lucide-react";
import { confirmEmailChange } from "@/lib/actions/profile";

const easeOut = "easeOut" as const;

type Status = "loading" | "success" | "error";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de verificação ausente.");
      return;
    }

    (async () => {
      try {
        const result = await confirmEmailChange(token);
        if (result?.error) {
          setStatus("error");
          setMessage(result.error);
        } else {
          setStatus("success");
          setMessage("E-mail confirmado com sucesso!");
        }
      } catch {
        setStatus("error");
        setMessage("Erro ao verificar e-mail. Tente novamente.");
      }
    })();
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="flex flex-col items-center w-full text-center"
    >
      <div className="mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-600 to-purple-600 shadow-[0_0_40px_rgba(124,58,237,0.25)]">
        <Receipt className="h-11 w-11 text-white" strokeWidth={2.25} />
      </div>

      <h1 className="text-2xl font-bold text-white tracking-tight mb-8">Verificação de e-mail</h1>

      {status === "loading" && (
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verificando seu e-mail...</span>
        </div>
      )}

      {status === "success" && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-6 w-full"
        >
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <p className="text-sm text-emerald-200">{message}</p>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 rounded-xl border border-red-900/50 bg-red-950/30 p-6 w-full"
        >
          <XCircle className="h-12 w-12 text-red-400" />
          <p className="text-sm text-red-300">{message}</p>
        </motion.div>
      )}

      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-violet-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>
    </motion.div>
  );
}
