"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Receipt,
  Bell,
  Shield,
  Save,
  Loader2,
  Settings as SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getAllSettings, updateSetting } from "@/lib/actions/settings";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// Default values used when keys don't exist yet in global_settings.
const DEFAULTS = {
  nfe_max_retries: 3,
  nfe_timeout_seconds: 60,
  nfe_environment: "homologacao" as "producao" | "homologacao",
  nfe_retry_on_transient: true,
  notify_platform_enabled: true,
  notify_email_enabled: false,
  notify_alert_email: "",
  notify_failure_threshold: 5,
  security_session_ttl_hours: 24,
  security_password_min_length: 8,
  security_require_2fa: false,
};

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-xl bg-muted/50 border border-border"
        />
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground/80 mb-1.5">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>;
}

function readNumber(map: Record<string, unknown>, key: string, fallback: number): number {
  const val = map[key];
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

function readBoolean(map: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const val = map[key];
  if (typeof val === "boolean") return val;
  return fallback;
}

function readString(map: Record<string, unknown>, key: string, fallback: string): string {
  const val = map[key];
  if (typeof val === "string") return val;
  return fallback;
}

export function SettingsContent() {
  const [loading, setLoading] = useState(true);

  // NFe section state
  const [nfeMaxRetries, setNfeMaxRetries] = useState(DEFAULTS.nfe_max_retries);
  const [nfeTimeout, setNfeTimeout] = useState(DEFAULTS.nfe_timeout_seconds);
  const [nfeEnvironment, setNfeEnvironment] = useState<"producao" | "homologacao">(
    DEFAULTS.nfe_environment
  );
  const [nfeRetryTransient, setNfeRetryTransient] = useState(
    DEFAULTS.nfe_retry_on_transient
  );
  const [savingNfe, startSavingNfe] = useTransition();

  // Notifications section state
  const [notifyPlatform, setNotifyPlatform] = useState(DEFAULTS.notify_platform_enabled);
  const [notifyEmail, setNotifyEmail] = useState(DEFAULTS.notify_email_enabled);
  const [notifyAlertEmail, setNotifyAlertEmail] = useState(DEFAULTS.notify_alert_email);
  const [notifyThreshold, setNotifyThreshold] = useState(DEFAULTS.notify_failure_threshold);
  const [savingNotify, startSavingNotify] = useTransition();

  // Security section state
  const [sessionTtlHours, setSessionTtlHours] = useState(
    DEFAULTS.security_session_ttl_hours
  );
  const [passwordMinLength, setPasswordMinLength] = useState(
    DEFAULTS.security_password_min_length
  );
  const [require2fa, setRequire2fa] = useState(DEFAULTS.security_require_2fa);
  const [savingSecurity, startSavingSecurity] = useTransition();

  useEffect(() => {
    async function load() {
      const result = await getAllSettings();
      if (result.success && result.data) {
        const d = result.data;
        setNfeMaxRetries(readNumber(d, "nfe_max_retries", DEFAULTS.nfe_max_retries));
        setNfeTimeout(readNumber(d, "nfe_timeout_seconds", DEFAULTS.nfe_timeout_seconds));
        const env = readString(d, "nfe_environment", DEFAULTS.nfe_environment);
        setNfeEnvironment(env === "producao" ? "producao" : "homologacao");
        setNfeRetryTransient(
          readBoolean(d, "nfe_retry_on_transient", DEFAULTS.nfe_retry_on_transient)
        );
        setNotifyPlatform(
          readBoolean(d, "notify_platform_enabled", DEFAULTS.notify_platform_enabled)
        );
        setNotifyEmail(readBoolean(d, "notify_email_enabled", DEFAULTS.notify_email_enabled));
        setNotifyAlertEmail(
          readString(d, "notify_alert_email", DEFAULTS.notify_alert_email)
        );
        setNotifyThreshold(
          readNumber(d, "notify_failure_threshold", DEFAULTS.notify_failure_threshold)
        );
        setSessionTtlHours(
          readNumber(d, "security_session_ttl_hours", DEFAULTS.security_session_ttl_hours)
        );
        setPasswordMinLength(
          readNumber(
            d,
            "security_password_min_length",
            DEFAULTS.security_password_min_length
          )
        );
        setRequire2fa(
          readBoolean(d, "security_require_2fa", DEFAULTS.security_require_2fa)
        );
      } else {
        toast.error("Erro ao carregar configurações");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function saveMany(entries: Array<[string, unknown]>): Promise<boolean> {
    for (const [key, value] of entries) {
      const r = await updateSetting(key, value);
      if (!r.success) {
        toast.error(r.error || "Erro ao salvar");
        return false;
      }
    }
    return true;
  }

  function handleSaveNfe() {
    startSavingNfe(async () => {
      const ok = await saveMany([
        ["nfe_max_retries", nfeMaxRetries],
        ["nfe_timeout_seconds", nfeTimeout],
        ["nfe_environment", nfeEnvironment],
        ["nfe_retry_on_transient", nfeRetryTransient],
      ]);
      if (ok) toast.success("Configurações de emissão salvas");
    });
  }

  function handleSaveNotify() {
    startSavingNotify(async () => {
      const ok = await saveMany([
        ["notify_platform_enabled", notifyPlatform],
        ["notify_email_enabled", notifyEmail],
        ["notify_alert_email", notifyAlertEmail],
        ["notify_failure_threshold", notifyThreshold],
      ]);
      if (ok) toast.success("Configurações de notificações salvas");
    });
  }

  function handleSaveSecurity() {
    startSavingSecurity(async () => {
      const ok = await saveMany([
        ["security_session_ttl_hours", sessionTtlHours],
        ["security_password_min_length", passwordMinLength],
        ["security_require_2fa", require2fa],
      ]);
      if (ok) toast.success("Configurações de segurança salvas");
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10 border border-violet-600/20">
            <SettingsIcon className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground">
              Configurações globais da plataforma. Apenas Super Admin tem acesso.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Emissão de NFe */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Receipt className="h-4 w-4 text-violet-500" />
                  Emissão de NFe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <FieldLabel>Máximo de tentativas</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={nfeMaxRetries}
                      onChange={(e) =>
                        setNfeMaxRetries(
                          Math.min(10, Math.max(0, parseInt(e.target.value) || 0))
                        )
                      }
                      className="bg-muted/50 border-border text-foreground"
                    />
                    <FieldHint>
                      Número máximo de vezes que o sistema tentará reemitir uma NFe que falhou (0-10)
                    </FieldHint>
                  </div>

                  <div>
                    <FieldLabel>Timeout por emissão (segundos)</FieldLabel>
                    <Input
                      type="number"
                      min={30}
                      max={300}
                      value={nfeTimeout}
                      onChange={(e) =>
                        setNfeTimeout(
                          Math.min(300, Math.max(30, parseInt(e.target.value) || 30))
                        )
                      }
                      className="bg-muted/50 border-border text-foreground"
                    />
                    <FieldHint>
                      Tempo máximo de espera por resposta do GOV.BR por emissão (30-300s)
                    </FieldHint>
                  </div>

                  <div>
                    <FieldLabel>Ambiente</FieldLabel>
                    <CustomSelect
                      value={nfeEnvironment}
                      onChange={(val) =>
                        setNfeEnvironment(val as "producao" | "homologacao")
                      }
                      options={[
                        {
                          value: "homologacao",
                          label: "Homologação",
                          description: "Ambiente de testes — não gera efeitos fiscais",
                        },
                        {
                          value: "producao",
                          label: "Produção",
                          description: "Ambiente real — NFes emitidas têm valor fiscal",
                        },
                      ]}
                    />
                    <FieldHint>
                      Selecione o ambiente que a plataforma usará para emitir NFes
                    </FieldHint>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <FieldLabel>Retentar em falha transitória</FieldLabel>
                      <FieldHint>
                        Reemite automaticamente quando o erro é transitório (rede, timeout, 5xx)
                      </FieldHint>
                    </div>
                    <Switch
                      checked={nfeRetryTransient}
                      onCheckedChange={setNfeRetryTransient}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveNfe}
                    disabled={savingNfe}
                    className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer transition-all duration-200"
                  >
                    {savingNfe ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notificações */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Bell className="h-4 w-4 text-violet-500" />
                  Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground/80">
                        Notificações na plataforma
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Alertas dentro do painel
                      </p>
                    </div>
                    <Switch
                      checked={notifyPlatform}
                      onCheckedChange={setNotifyPlatform}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground/80">
                        Notificações por e-mail
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enviar alertas por e-mail
                      </p>
                    </div>
                    <Switch
                      checked={notifyEmail}
                      onCheckedChange={setNotifyEmail}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div>
                    <FieldLabel>E-mail para alertas</FieldLabel>
                    <Input
                      type="email"
                      value={notifyAlertEmail}
                      onChange={(e) => setNotifyAlertEmail(e.target.value)}
                      placeholder="alertas@exemplo.com"
                      className="bg-muted/50 border-border text-foreground"
                    />
                    <FieldHint>
                      Endereço que receberá alertas críticos da plataforma
                    </FieldHint>
                  </div>

                  <div>
                    <FieldLabel>Threshold de falhas</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={notifyThreshold}
                      onChange={(e) =>
                        setNotifyThreshold(
                          Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
                        )
                      }
                      className="bg-muted/50 border-border text-foreground"
                    />
                    <FieldHint>
                      Quantidade de falhas consecutivas para disparar alerta
                    </FieldHint>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveNotify}
                    disabled={savingNotify}
                    className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer transition-all duration-200"
                  >
                    {savingNotify ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Segurança */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Shield className="h-4 w-4 text-violet-500" />
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <FieldLabel>TTL da sessão (horas)</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={720}
                      value={sessionTtlHours}
                      onChange={(e) =>
                        setSessionTtlHours(
                          Math.min(720, Math.max(1, parseInt(e.target.value) || 1))
                        )
                      }
                      className="bg-muted/50 border-border text-foreground"
                    />
                    <FieldHint>
                      Duração da sessão do usuário antes de exigir novo login
                    </FieldHint>
                  </div>

                  <div>
                    <FieldLabel>Tamanho mínimo da senha</FieldLabel>
                    <Input
                      type="number"
                      min={6}
                      max={64}
                      value={passwordMinLength}
                      onChange={(e) =>
                        setPasswordMinLength(
                          Math.min(64, Math.max(6, parseInt(e.target.value) || 8))
                        )
                      }
                      className="bg-muted/50 border-border text-foreground"
                    />
                    <FieldHint>
                      Número mínimo de caracteres exigido nas senhas dos usuários
                    </FieldHint>
                  </div>

                  <div className="flex items-center justify-between py-2 md:col-span-2">
                    <div>
                      <FieldLabel>Exigir 2FA (futuro)</FieldLabel>
                      <FieldHint>
                        Quando disponível, obrigará autenticação em dois fatores para todos os usuários
                      </FieldHint>
                    </div>
                    <Switch
                      checked={require2fa}
                      onCheckedChange={setRequire2fa}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveSecurity}
                    disabled={savingSecurity}
                    className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer transition-all duration-200"
                  >
                    {savingSecurity ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
