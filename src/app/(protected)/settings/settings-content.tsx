"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Save,
  Globe,
  Mail,
  Bell,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const easeOut = "easeOut" as const;

interface SettingGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: { key: string; label: string; value: string; type?: string }[];
}

const initialGroups: SettingGroup[] = [
  {
    id: "general",
    title: "Geral",
    description: "Configurações gerais da plataforma.",
    icon: Globe,
    fields: [
      { key: "platform_name", label: "Nome da plataforma", value: "Nexus NFE" },
      { key: "support_email", label: "E-mail de suporte", value: "suporte@nexusai360.com" },
    ],
  },
  {
    id: "email",
    title: "E-mail transacional",
    description: "Configurações de envio de e-mails.",
    icon: Mail,
    fields: [
      { key: "smtp_from", label: "Remetente", value: "Nexus NFE <noreply@nexusai360.com>" },
      { key: "smtp_host", label: "Host SMTP", value: "smtp.resend.com" },
    ],
  },
  {
    id: "nfe",
    title: "Emissão de NFe",
    description: "Parâmetros da emissão via GOV.BR.",
    icon: FileText,
    fields: [
      { key: "retry_attempts", label: "Tentativas em caso de falha", value: "3", type: "number" },
      { key: "timeout_seconds", label: "Timeout (segundos)", value: "60", type: "number" },
    ],
  },
  {
    id: "notifications",
    title: "Notificações",
    description: "Canais e alertas da plataforma.",
    icon: Bell,
    fields: [
      { key: "alert_email", label: "E-mail para alertas", value: "ops@nexusai360.com" },
    ],
  },
  {
    id: "security",
    title: "Segurança",
    description: "Política de senhas e sessões.",
    icon: ShieldCheck,
    fields: [
      { key: "session_ttl_hours", label: "TTL da sessão (horas)", value: "24", type: "number" },
      { key: "password_min_length", label: "Tamanho mínimo da senha", value: "8", type: "number" },
    ],
  },
];

export function SettingsContent() {
  const [groups, setGroups] = useState<SettingGroup[]>(initialGroups);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFieldChange(groupId: string, key: string, value: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              fields: g.fields.map((f) => (f.key === key ? { ...f, value } : f)),
            }
          : g
      )
    );
  }

  function handleSave(groupId: string) {
    setSavingGroup(groupId);
    startTransition(async () => {
      try {
        // Placeholder: integrar server action de settings quando disponível
        await new Promise((r) => setTimeout(r, 600));
        toast.success("Configurações salvas!");
      } catch {
        toast.error("Erro ao salvar configurações.");
      } finally {
        setSavingGroup(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: easeOut }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie as configurações globais da plataforma. Apenas Super Admins têm acesso.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {groups.map((group, idx) => {
          const Icon = group.icon;
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05, ease: easeOut }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle>{group.title}</CardTitle>
                      <CardDescription>{group.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`${group.id}-${field.key}`}>{field.label}</Label>
                      <Input
                        id={`${group.id}-${field.key}`}
                        type={field.type || "text"}
                        value={field.value}
                        onChange={(e) => handleFieldChange(group.id, field.key, e.target.value)}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => handleSave(group.id)}
                    disabled={isPending && savingGroup === group.id}
                  >
                    {isPending && savingGroup === group.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Salvar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
