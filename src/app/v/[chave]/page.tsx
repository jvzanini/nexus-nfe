import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Ban, Download, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { APP_CONFIG } from "@/lib/app.config";

export const metadata = { title: "Validação de NFS-e" };
export const dynamic = "force-dynamic";

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "");
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDocumento(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return formatCnpj(v);
}

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PublicNfsePage({
  params,
}: {
  params: Promise<{ chave: string }>;
}) {
  const { chave } = await params;
  const chaveLimpa = chave.replace(/\D/g, "");

  const nfse = await prisma.nfse.findFirst({
    where: { chaveAcesso: chaveLimpa },
    include: { clienteMei: true },
  });

  if (!nfse) notFound();

  const isAutorizada = nfse.status === "autorizada";
  const isCancelada = nfse.status === "cancelada";

  const statusBadge = isAutorizada ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      NFS-e Autorizada
    </span>
  ) : isCancelada ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-500/30 bg-zinc-500/15 px-3 py-1 text-xs font-medium text-zinc-400">
      <Ban className="h-3.5 w-3.5" />
      NFS-e Cancelada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
      <XCircle className="h-3.5 w-3.5" />
      Status: {nfse.status}
    </span>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/30 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-violet-600/15 border border-violet-500/30 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">{APP_CONFIG.name}</div>
              <div className="text-[11px] text-muted-foreground">Validação pública de NFS-e</div>
            </div>
          </div>
          <Link
            href={`https://${APP_CONFIG.domain}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {APP_CONFIG.domain}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              NFS-e {nfse.serie}-{nfse.numero}
              {nfse.numeroNfse && (
                <span className="text-base font-normal text-muted-foreground ml-2">
                  • Nº {nfse.numeroNfse}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
              Chave: {chaveLimpa}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge}
            {isAutorizada && (
              <a
                href={`/api/public/nfse/${chaveLimpa}/pdf`}
                className="inline-flex items-center gap-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-3 py-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar DANFS-e
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-xl border border-border bg-card/50 p-5">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
              Prestador
            </h2>
            <div className="space-y-1.5">
              <div className="font-medium text-foreground">{nfse.clienteMei.razaoSocial}</div>
              <div className="text-xs text-muted-foreground font-mono">
                CNPJ: {formatCnpj(nfse.clienteMei.cnpj)}
              </div>
              <div className="text-xs text-muted-foreground">
                {nfse.clienteMei.logradouro}, {nfse.clienteMei.numero} — {nfse.clienteMei.bairro}
              </div>
              <div className="text-xs text-muted-foreground">{nfse.clienteMei.uf}</div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/50 p-5">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
              Tomador
            </h2>
            <div className="space-y-1.5">
              <div className="font-medium text-foreground">{nfse.tomadorNome}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {formatDocumento(nfse.tomadorDocumento)}
              </div>
              {nfse.tomadorEmail && (
                <div className="text-xs text-muted-foreground">{nfse.tomadorEmail}</div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Serviço
          </h2>
          <div className="space-y-2">
            <div className="text-sm text-foreground/90">{nfse.descricaoServico}</div>
            <div className="text-xs text-muted-foreground">
              Código: <span className="font-mono">{nfse.codigoServico}</span>
              {nfse.codigoNbs && (
                <>
                  {" "}
                  • NBS: <span className="font-mono">{nfse.codigoNbs}</span>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <Stat
              label="Valor do serviço"
              value={formatBRL(Number(nfse.valorServico))}
              accent="text-emerald-400"
            />
            <Stat label="Alíquota ISS" value={`${Number(nfse.aliquotaIss).toFixed(2)}%`} />
            <Stat label="Valor ISS" value={formatBRL(Number(nfse.valorIss))} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/50 p-5 text-xs text-muted-foreground space-y-1.5">
          <div>
            <span className="text-foreground/80">Data emissão:</span>{" "}
            {nfse.dataEmissao.toLocaleString("pt-BR")}
          </div>
          {nfse.dataAutorizacao && (
            <div>
              <span className="text-foreground/80">Data autorização:</span>{" "}
              {nfse.dataAutorizacao.toLocaleString("pt-BR")}
            </div>
          )}
          {nfse.mensagemResposta && (
            <div>
              <span className="text-foreground/80">Mensagem SEFIN:</span> {nfse.mensagemResposta}
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          Documento validado pela plataforma {APP_CONFIG.name} —{" "}
          <Link href={`https://${APP_CONFIG.domain}`} className="text-violet-400 hover:underline">
            {APP_CONFIG.domain}
          </Link>
        </footer>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${accent ?? "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
