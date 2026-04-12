"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { stepTomadorSchema } from "@/lib/validation/nfse";
import type { NfseFormData } from "@/components/nfse/nova-nfse-form";
import { listarTomadoresFavoritos, registrarUsoTomador, type TomadorFavoritoItem } from "@/lib/actions/tomadores-favoritos";

interface StepTomadorProps {
  data: NfseFormData["tomador"];
  clienteMeiId?: string;
  onNext: (data: NfseFormData["tomador"]) => void;
  onBack: () => void;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function StepTomador({ data, clienteMeiId, onNext, onBack }: StepTomadorProps) {
  const [tipo, setTipo] = useState<"cpf" | "cnpj">(data?.tomadorTipo ?? "cpf");
  const [documento, setDocumento] = useState(data?.tomadorDocumento ?? "");
  const [nome, setNome] = useState(data?.tomadorNome ?? "");
  const [email, setEmail] = useState(data?.tomadorEmail ?? "");
  const [showEndereco, setShowEndereco] = useState(false);
  const [cep, setCep] = useState(data?.tomadorCep ?? "");
  const [logradouro, setLogradouro] = useState(data?.tomadorLogradouro ?? "");
  const [numero, setNumero] = useState(data?.tomadorNumero ?? "");
  const [complemento, setComplemento] = useState(
    data?.tomadorComplemento ?? ""
  );
  const [bairro, setBairro] = useState(data?.tomadorBairro ?? "");
  const [municipioIbge, setMunicipioIbge] = useState(
    data?.tomadorMunicipioIbge ?? ""
  );

  const [favoritos, setFavoritos] = useState<TomadorFavoritoItem[]>([]);

  useEffect(() => {
    if (!clienteMeiId) return;
    listarTomadoresFavoritos(clienteMeiId).then((r) => {
      if (r.success && r.data) setFavoritos(r.data);
    });
  }, [clienteMeiId]);

  function handleDocumentoChange(value: string) {
    if (tipo === "cpf") {
      setDocumento(formatCpf(value));
    } else {
      setDocumento(formatCnpj(value));
    }
  }

  function handleTipoChange(newTipo: "cpf" | "cnpj") {
    setTipo(newTipo);
    setDocumento("");
  }

  function handleNext() {
    const parsed = stepTomadorSchema.safeParse({
      tomadorTipo: tipo,
      tomadorDocumento: documento,
      tomadorNome: nome,
      tomadorEmail: email || undefined,
      tomadorCep: cep || undefined,
      tomadorLogradouro: logradouro || undefined,
      tomadorNumero: numero || undefined,
      tomadorComplemento: complemento || undefined,
      tomadorBairro: bairro || undefined,
      tomadorMunicipioIbge: municipioIbge || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    onNext(parsed.data);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Dados do Tomador
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informe os dados de quem está contratando o serviço
        </p>
      </div>

      {/* Tomadores recentes */}
      {favoritos.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Tomadores recentes
          </p>
          <div className="flex flex-wrap gap-2">
            {favoritos.slice(0, 5).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  const newTipo = t.tipo === "cnpj" ? "cnpj" : "cpf";
                  setTipo(newTipo as "cpf" | "cnpj");
                  setDocumento(newTipo === "cpf" ? formatCpf(t.documento) : formatCnpj(t.documento));
                  setNome(t.nome);
                  setEmail(t.email ?? "");
                  if (t.endereco) {
                    setShowEndereco(true);
                    setCep(t.endereco.cep ? formatCep(t.endereco.cep) : "");
                    setLogradouro(t.endereco.logradouro ?? "");
                    setNumero(t.endereco.numero ?? "");
                    setComplemento(t.endereco.complemento ?? "");
                    setBairro(t.endereco.bairro ?? "");
                    setMunicipioIbge(t.endereco.municipioIbge ?? "");
                  }
                  registrarUsoTomador(t.id);
                }}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <span className="font-medium text-foreground">{t.nome}</span>
                <span className="text-xs text-muted-foreground">{t.documento}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tipo de documento */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Tipo de Documento
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={tipo === "cpf" ? "default" : "outline"}
            onClick={() => handleTipoChange("cpf")}
            className={`flex-1 cursor-pointer ${
              tipo === "cpf"
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : ""
            }`}
          >
            CPF
          </Button>
          <Button
            type="button"
            variant={tipo === "cnpj" ? "default" : "outline"}
            onClick={() => handleTipoChange("cnpj")}
            className={`flex-1 cursor-pointer ${
              tipo === "cnpj"
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : ""
            }`}
          >
            CNPJ
          </Button>
        </div>
      </div>

      {/* Documento */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          {tipo === "cpf" ? "CPF" : "CNPJ"}
        </Label>
        <Input
          value={documento}
          onChange={(e) => handleDocumentoChange(e.target.value)}
          placeholder={tipo === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
          className="bg-muted/50 border-border text-foreground font-mono"
        />
      </div>

      {/* Nome */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          Nome / Razão Social
        </Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome completo ou razão social do tomador"
          className="bg-muted/50 border-border text-foreground"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">
          E-mail (opcional)
        </Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          className="bg-muted/50 border-border text-foreground"
        />
      </div>

      {/* Endereço expandível */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowEndereco(!showEndereco)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {showEndereco ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Endereço do tomador (opcional)
        </button>

        {showEndereco && (
          <div className="space-y-4 pl-1 border-l-2 border-border ml-2 pl-4">
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  CEP
                </Label>
                <Input
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                  placeholder="00000-000"
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Logradouro
                </Label>
                <Input
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Número
                </Label>
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Complemento
                </Label>
                <Input
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Bairro
                </Label>
                <Input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Município (IBGE)
                </Label>
                <Input
                  value={municipioIbge}
                  onChange={(e) =>
                    setMunicipioIbge(
                      e.target.value.replace(/\D/g, "").slice(0, 7)
                    )
                  }
                  placeholder="0000000"
                  className="bg-muted/50 border-border text-foreground font-mono"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
