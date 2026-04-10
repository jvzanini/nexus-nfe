"use client";

import { useState, useTransition, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Camera, Sun, Moon, Monitor, KeyRound, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfile,
  updateAvatar,
  requestEmailChange,
} from "@/lib/actions/profile";
import { changePassword } from "@/lib/actions/profile";

const easeOut = "easeOut" as const;

interface ProfileContentProps {
  initial: {
    name: string;
    email: string;
    avatarUrl: string | null;
    theme: "dark" | "light" | "system";
  };
}

export function ProfileContent({ initial }: ProfileContentProps) {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [isSavingProfile, startSavingProfile] = useTransition();
  const [isSavingEmail, startSavingEmail] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Password form
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isSavingPass, startSavingPass] = useTransition();

  function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startSavingProfile(async () => {
      try {
        const result = await updateProfile({ name });
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Perfil atualizado!");
      } catch {
        toast.error("Erro ao atualizar perfil.");
      }
    });
  }

  function handleRequestEmailChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (email === initial.email) {
      toast.info("Informe um novo e-mail diferente do atual.");
      return;
    }
    startSavingEmail(async () => {
      try {
        const result = await requestEmailChange(email);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Enviamos um link de confirmação para o novo e-mail.");
      } catch {
        toast.error("Erro ao solicitar alteração de e-mail.");
      }
    });
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      try {
        const result = await updateAvatar(dataUrl);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setAvatarUrl(dataUrl);
        toast.success("Foto atualizada!");
      } catch {
        toast.error("Erro ao atualizar foto.");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPass.length < 8) {
      toast.error("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("As senhas não coincidem.");
      return;
    }
    startSavingPass(async () => {
      try {
        const result = await changePassword({ currentPassword: currentPass, newPassword: newPass });
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Senha alterada com sucesso!");
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      } catch {
        toast.error("Erro ao alterar senha.");
      }
    });
  }

  const themes = [
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "light", label: "Claro", icon: Sun },
    { value: "system", label: "Sistema", icon: Monitor },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOut }}
      className="space-y-6 max-w-3xl"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie suas informações pessoais, segurança e preferências.
        </p>
      </div>

      {/* Avatar + dados */}
      <Card>
        <CardHeader>
          <CardTitle>Informações pessoais</CardTitle>
          <CardDescription>Atualize seu nome e foto de perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-2xl font-semibold text-white overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    (name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:brightness-110 cursor-pointer"
                  aria-label="Trocar foto"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                <UserIcon className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Nome
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar alterações
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email com fluxo de verificação */}
      <Card>
        <CardHeader>
          <CardTitle>E-mail</CardTitle>
          <CardDescription>
            Ao alterar o e-mail enviaremos um link de confirmação para o novo endereço.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestEmailChange} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Endereço de e-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={isSavingEmail || email === initial.email}>
              {isSavingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" /> Solicitar alteração
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Altere sua senha periodicamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="currentPass">Senha atual</Label>
              <Input
                id="currentPass"
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPass">Nova senha</Label>
                <Input
                  id="newPass"
                  type="password"
                  minLength={8}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPass">Confirmar nova senha</Label>
                <Input
                  id="confirmPass"
                  type="password"
                  minLength={8}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={isSavingPass}>
              {isSavingPass ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" /> Alterar senha
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>Escolha o tema da plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = (theme ?? "dark") === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all cursor-pointer ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
