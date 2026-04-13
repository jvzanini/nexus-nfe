"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Key,
  Zap,
  Shield,
  BookOpen,
  Terminal,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "DELETE";
type Language = "curl" | "javascript" | "python";

interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Endpoint {
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  params?: Param[];
  body?: string;
  examples: Record<Language, string>;
  response: string;
}

// ---------------------------------------------------------------------------
// Method badge colors
// ---------------------------------------------------------------------------

const methodColors: Record<HttpMethod, string> = {
  GET: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  POST: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  DELETE: "border-red-500/30 bg-red-500/10 text-red-400",
};

const langLabels: Record<Language, string> = {
  curl: "cURL",
  javascript: "JavaScript",
  python: "Python",
};

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------

function CodeBlock({
  code,
  languages,
}: {
  code: Record<Language, string> | string;
  languages?: Language[];
}) {
  const isMulti = typeof code !== "string";
  const langs = languages ?? (isMulti ? (Object.keys(code) as Language[]) : []);
  const [activeLang, setActiveLang] = useState<Language>(langs[0] ?? "curl");
  const [copied, setCopied] = useState(false);

  const currentCode = isMulti ? code[activeLang] : code;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  }, [currentCode]);

  return (
    <div className="rounded-lg border border-border bg-zinc-950 overflow-hidden">
      {isMulti && langs.length > 1 && (
        <div className="flex items-center gap-1 border-b border-border bg-zinc-900/80 px-3 py-1.5">
          {langs.map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                activeLang === lang
                  ? "bg-violet-600/20 text-violet-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {langLabels[lang]}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <div className="relative">
        {(!isMulti || langs.length <= 1) && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code className="font-mono text-zinc-300">{currentCode}</code>
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EndpointCard
// ---------------------------------------------------------------------------

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${methodColors[endpoint.method]}`}
        >
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-foreground/90">{endpoint.path}</code>
        <span className="ml-auto text-sm text-muted-foreground hidden sm:inline">
          {endpoint.title}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-5 space-y-5">
              <p className="text-sm text-muted-foreground">{endpoint.description}</p>

              {endpoint.params && endpoint.params.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Parametros
                  </h4>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nome</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Obrig.</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Descricao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.params.map((p) => (
                          <tr key={p.name} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-mono text-xs text-violet-400">{p.name}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{p.type}</td>
                            <td className="px-3 py-2 text-xs">
                              {p.required ? (
                                <span className="text-amber-400">Sim</span>
                              ) : (
                                <span className="text-muted-foreground">Nao</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {endpoint.body && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Body (JSON)
                  </h4>
                  <CodeBlock code={endpoint.body} />
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Exemplo de requisicao
                </h4>
                <CodeBlock code={endpoint.examples} />
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Resposta
                </h4>
                <CodeBlock code={endpoint.response} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Endpoint data
// ---------------------------------------------------------------------------

const BASE = "https://nfe.nexusai360.com/api/v1";

function curl(method: HttpMethod, path: string, body?: string) {
  const parts = [`curl -X ${method} "${BASE}${path}"`, `  -H "X-API-Key: sua_api_key"`];
  if (body) {
    parts.push(`  -H "Content-Type: application/json"`);
    parts.push(`  -d '${body}'`);
  }
  return parts.join(" \\\n");
}

function js(method: HttpMethod, path: string, body?: string) {
  const opts = [`  method: "${method}"`, `  headers: {\n    "X-API-Key": "sua_api_key"${body ? ',\n    "Content-Type": "application/json"' : ""}\n  }`];
  if (body) opts.push(`  body: JSON.stringify(${body})`);
  return `const res = await fetch("${BASE}${path}", {\n${opts.join(",\n")}\n});\nconst data = await res.json();`;
}

function py(method: HttpMethod, path: string, body?: string) {
  const lines = ["import requests", "", `headers = {"X-API-Key": "sua_api_key"}`];
  if (body) {
    lines.push(`payload = ${body}`);
    lines.push(`res = requests.${method.toLowerCase()}("${BASE}${path}", headers=headers, json=payload)`);
  } else {
    lines.push(`res = requests.${method.toLowerCase()}("${BASE}${path}", headers=headers)`);
  }
  lines.push("data = res.json()");
  return lines.join("\n");
}

const endpoints: { section: string; icon: React.ReactNode; items: Endpoint[] }[] = [
  {
    section: "NFS-e",
    icon: <Zap className="h-4 w-4 text-violet-400" />,
    items: [
      {
        method: "GET",
        path: "/nfse",
        title: "Listar notas fiscais",
        description:
          "Retorna uma lista paginada de notas fiscais do tenant autenticado. Suporta filtros por status e busca textual.",
        params: [
          { name: "page", type: "number", required: false, description: "Pagina (default: 1)" },
          { name: "limit", type: "number", required: false, description: "Itens por pagina (default: 20, max: 100)" },
          { name: "status", type: "string", required: false, description: "Filtrar por status: rascunho, pendente, processando, autorizada, rejeitada, cancelada" },
          { name: "q", type: "string", required: false, description: "Busca por cliente, tomador ou numero" },
        ],
        examples: {
          curl: curl("GET", "/nfse?page=1&limit=20&status=autorizada"),
          javascript: js("GET", "/nfse?page=1&limit=20&status=autorizada"),
          python: py("GET", "/nfse?page=1&limit=20&status=autorizada"),
        },
        response: JSON.stringify(
          {
            data: [
              {
                id: "clx1abc...",
                numero: 1,
                status: "autorizada",
                clienteNome: "Joao Silva MEI",
                tomadorNome: "Empresa XYZ Ltda",
                valorServico: 1500.0,
                createdAt: "2026-04-10T14:30:00Z",
              },
            ],
            meta: { page: 1, limit: 20, total: 42 },
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/nfse",
        title: "Criar rascunho",
        description:
          "Cria um rascunho de NFS-e. O rascunho pode ser editado antes de ser enviado para emissao.",
        body: JSON.stringify(
          {
            clienteId: "clx1abc...",
            tomador: {
              cpfCnpj: "12345678000199",
              razaoSocial: "Empresa XYZ Ltda",
              email: "contato@xyz.com",
            },
            servico: {
              descricao: "Desenvolvimento de software",
              codigoNbs: "1.0101",
              valorServico: 1500.0,
              aliquotaIss: 2.0,
            },
          },
          null,
          2
        ),
        examples: {
          curl: curl("POST", "/nfse", '{"clienteId":"clx1abc...","tomador":{...},"servico":{...}}'),
          javascript: js("POST", "/nfse", '{\n    clienteId: "clx1abc...",\n    tomador: { cpfCnpj: "12345678000199", razaoSocial: "Empresa XYZ Ltda" },\n    servico: { descricao: "Desenvolvimento de software", valorServico: 1500 }\n  }'),
          python: py("POST", "/nfse", '{\n    "clienteId": "clx1abc...",\n    "tomador": {"cpfCnpj": "12345678000199", "razaoSocial": "Empresa XYZ Ltda"},\n    "servico": {"descricao": "Desenvolvimento de software", "valorServico": 1500}\n}'),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx2def...",
              status: "rascunho",
              numero: null,
              createdAt: "2026-04-12T10:00:00Z",
            },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/nfse/{id}",
        title: "Detalhes da nota",
        description: "Retorna todos os detalhes de uma NFS-e especifica, incluindo dados do tomador, servico e timeline de status.",
        params: [{ name: "id", type: "string", required: true, description: "ID da NFS-e" }],
        examples: {
          curl: curl("GET", "/nfse/clx2def..."),
          javascript: js("GET", "/nfse/clx2def..."),
          python: py("GET", "/nfse/clx2def..."),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx2def...",
              numero: 1,
              status: "autorizada",
              chaveAcesso: "NFSe123456789...",
              clienteNome: "Joao Silva MEI",
              tomador: { cpfCnpj: "12345678000199", razaoSocial: "Empresa XYZ Ltda" },
              servico: { descricao: "Desenvolvimento de software", valorServico: 1500.0 },
              createdAt: "2026-04-10T14:30:00Z",
              emitidaAt: "2026-04-10T14:31:00Z",
            },
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/nfse/{id}/emitir",
        title: "Enfileirar para emissao",
        description:
          "Envia o rascunho para a fila de emissao. O processamento e assincrono. Consulte o status via GET /nfse/{id} ou use polling.",
        params: [{ name: "id", type: "string", required: true, description: "ID da NFS-e (deve estar em rascunho)" }],
        examples: {
          curl: curl("POST", "/nfse/clx2def.../emitir"),
          javascript: js("POST", "/nfse/clx2def.../emitir"),
          python: py("POST", "/nfse/clx2def.../emitir"),
        },
        response: JSON.stringify(
          {
            data: { id: "clx2def...", status: "pendente", message: "NFS-e enfileirada para emissao" },
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/nfse/{id}/cancelar",
        title: "Cancelar nota",
        description:
          "Cancela uma NFS-e autorizada. O cancelamento so e permitido em ate 24 horas apos a emissao. Requer motivo.",
        params: [{ name: "id", type: "string", required: true, description: "ID da NFS-e (deve estar autorizada)" }],
        body: JSON.stringify({ motivo: "Erro nos dados do tomador" }, null, 2),
        examples: {
          curl: curl("POST", "/nfse/clx2def.../cancelar", '{"motivo":"Erro nos dados do tomador"}'),
          javascript: js("POST", "/nfse/clx2def.../cancelar", '{ motivo: "Erro nos dados do tomador" }'),
          python: py("POST", "/nfse/clx2def.../cancelar", '{"motivo": "Erro nos dados do tomador"}'),
        },
        response: JSON.stringify(
          {
            data: { id: "clx2def...", status: "cancelada", canceladaAt: "2026-04-11T10:00:00Z" },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/nfse/{id}/xml",
        title: "Download XML",
        description:
          "Retorna o XML assinado/autorizado da NFS-e. Disponivel apenas para notas com status autorizada ou cancelada.",
        params: [{ name: "id", type: "string", required: true, description: "ID da NFS-e" }],
        examples: {
          curl: curl("GET", "/nfse/clx2def.../xml"),
          javascript: js("GET", "/nfse/clx2def.../xml"),
          python: py("GET", "/nfse/clx2def.../xml"),
        },
        response: `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse">
  <!-- XML autorizado da NFS-e -->
</NFSe>`,
      },
    ],
  },
  {
    section: "Clientes",
    icon: <Globe className="h-4 w-4 text-emerald-400" />,
    items: [
      {
        method: "GET",
        path: "/clientes",
        title: "Listar clientes MEI",
        description: "Retorna a lista de clientes MEI cadastrados no tenant.",
        params: [
          { name: "page", type: "number", required: false, description: "Pagina (default: 1)" },
          { name: "limit", type: "number", required: false, description: "Itens por pagina (default: 20)" },
        ],
        examples: {
          curl: curl("GET", "/clientes?page=1&limit=20"),
          javascript: js("GET", "/clientes?page=1&limit=20"),
          python: py("GET", "/clientes?page=1&limit=20"),
        },
        response: JSON.stringify(
          {
            data: [
              {
                id: "clx3ghi...",
                cnpj: "12345678000199",
                razaoSocial: "Joao Silva MEI",
                nomeFantasia: "JS Tecnologia",
                ativo: true,
                certificadoValido: true,
              },
            ],
            meta: { page: 1, limit: 20, total: 5 },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/clientes/{id}",
        title: "Detalhes do cliente",
        description: "Retorna os detalhes completos de um cliente MEI, incluindo status do certificado e dados de faturamento.",
        params: [{ name: "id", type: "string", required: true, description: "ID do cliente" }],
        examples: {
          curl: curl("GET", "/clientes/clx3ghi..."),
          javascript: js("GET", "/clientes/clx3ghi..."),
          python: py("GET", "/clientes/clx3ghi..."),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx3ghi...",
              cnpj: "12345678000199",
              razaoSocial: "Joao Silva MEI",
              nomeFantasia: "JS Tecnologia",
              email: "joao@email.com",
              ativo: true,
              certificado: { valido: true, expiraEm: "2027-01-15T00:00:00Z" },
              faturamento: { ano: 2026, total: 45000, limite: 81000, percentual: 55.56 },
            },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/clientes/{id}/faturamento",
        title: "Faturamento anual",
        description:
          "Retorna o faturamento acumulado do ano para o cliente MEI, com faixas de alerta baseadas no limite anual de R$ 81.000.",
        params: [
          { name: "id", type: "string", required: true, description: "ID do cliente" },
          { name: "ano", type: "number", required: false, description: "Ano de referencia (default: ano atual)" },
        ],
        examples: {
          curl: curl("GET", "/clientes/clx3ghi.../faturamento?ano=2026"),
          javascript: js("GET", "/clientes/clx3ghi.../faturamento?ano=2026"),
          python: py("GET", "/clientes/clx3ghi.../faturamento?ano=2026"),
        },
        response: JSON.stringify(
          {
            data: {
              ano: 2026,
              total: 45000,
              limite: 81000,
              percentual: 55.56,
              faixa: "ok",
              descricao: "Faturamento dentro do limite (55.56%)",
            },
          },
          null,
          2
        ),
      },
    ],
  },
  {
    section: "Catalogo",
    icon: <BookOpen className="h-4 w-4 text-amber-400" />,
    items: [
      {
        method: "GET",
        path: "/catalogo/nbs",
        title: "Buscar codigos de tributacao",
        description:
          "Busca codigos NBS (Nomenclatura Brasileira de Servicos) da LC 116/2003 por codigo ou descricao.",
        params: [
          { name: "q", type: "string", required: true, description: "Termo de busca (codigo ou descricao)" },
          { name: "limit", type: "number", required: false, description: "Max resultados (default: 20)" },
        ],
        examples: {
          curl: curl("GET", "/catalogo/nbs?q=software&limit=10"),
          javascript: js("GET", "/catalogo/nbs?q=software&limit=10"),
          python: py("GET", "/catalogo/nbs?q=software&limit=10"),
        },
        response: JSON.stringify(
          {
            data: [
              {
                codigo: "1.0101",
                descricao: "Analise e desenvolvimento de sistemas",
                aliquotaMinima: 2.0,
                aliquotaMaxima: 5.0,
              },
              {
                codigo: "1.0102",
                descricao: "Programacao",
                aliquotaMinima: 2.0,
                aliquotaMaxima: 5.0,
              },
            ],
          },
          null,
          2
        ),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

const errorCodes = [
  { code: 400, name: "Bad Request", description: "Corpo da requisicao invalido ou parametros ausentes" },
  { code: 401, name: "Unauthorized", description: "API Key ausente ou invalida" },
  { code: 403, name: "Forbidden", description: "Sem permissao para acessar este recurso" },
  { code: 404, name: "Not Found", description: "Recurso nao encontrado" },
  { code: 409, name: "Conflict", description: "Conflito de estado (ex: tentar emitir nota ja emitida)" },
  { code: 422, name: "Unprocessable Entity", description: "Dados validos mas regra de negocio impede a operacao" },
  { code: 429, name: "Too Many Requests", description: "Limite de requisicoes excedido (rate limit)" },
  { code: 500, name: "Internal Server Error", description: "Erro interno do servidor" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ApiDocsContent() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 pb-16"
    >
      {/* ----------------------------------------------------------------- */}
      {/* Hero */}
      {/* ----------------------------------------------------------------- */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20">
            <Code2 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">API REST v1</h1>
            <p className="text-sm text-muted-foreground">
              Integre a emissao de NFS-e diretamente no seu sistema
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-300">
            <Terminal className="h-3.5 w-3.5 text-violet-400" />
            {BASE}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: "Autenticacao", id: "auth", icon: <Key className="h-3 w-3" /> },
            { label: "NFS-e", id: "section-NFS-e", icon: <Zap className="h-3 w-3" /> },
            { label: "Clientes", id: "section-Clientes", icon: <Globe className="h-3 w-3" /> },
            { label: "Catalogo", id: "section-Catalogo", icon: <BookOpen className="h-3 w-3" /> },
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-violet-500/30 hover:text-violet-400"
            >
              {link.icon}
              {link.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Authentication */}
      {/* ----------------------------------------------------------------- */}
      <motion.div variants={itemVariants} id="auth" className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-foreground">Autenticacao</h2>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todas as requisicoes devem incluir o header{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-violet-400">
              X-API-Key
            </code>{" "}
            com sua chave de API. Chaves sao geradas na pagina de{" "}
            <span className="text-foreground font-medium">Configuracoes</span> da plataforma ou via
            CLI.
          </p>

          <CodeBlock
            code={`curl -H "X-API-Key: nxs_k1_abc123..." \\
  ${BASE}/nfse`}
          />

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <Shield className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Mantenha sua API Key em segredo. Nunca exponha em codigo client-side ou repositorios
              publicos. Caso uma chave seja comprometida, revogue-a imediatamente nas Configuracoes.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Response Format */}
      {/* ----------------------------------------------------------------- */}
      <motion.div variants={itemVariants} id="response-format" className="space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-foreground">Formato de resposta</h2>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todas as respostas seguem um formato padronizado. Sucesso retorna os dados em{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-emerald-400">
              data
            </code>
            . Erros retornam{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-red-400">
              error
            </code>{" "}
            com codigo e mensagem.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                Sucesso
              </h4>
              <CodeBlock
                code={JSON.stringify(
                  {
                    data: { id: "...", status: "autorizada" },
                    meta: { page: 1, limit: 20, total: 42 },
                  },
                  null,
                  2
                )}
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">
                Erro
              </h4>
              <CodeBlock
                code={JSON.stringify(
                  {
                    error: {
                      code: "VALIDATION_ERROR",
                      message: "O campo 'tomador.cpfCnpj' e obrigatorio",
                      details: [{ field: "tomador.cpfCnpj", message: "Campo obrigatorio" }],
                    },
                  },
                  null,
                  2
                )}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Respostas paginadas incluem o objeto{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-zinc-300">
              meta
            </code>{" "}
            com <code className="font-mono">page</code>, <code className="font-mono">limit</code> e{" "}
            <code className="font-mono">total</code>.
          </p>
        </div>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Endpoints */}
      {/* ----------------------------------------------------------------- */}
      {endpoints.map((group) => (
        <motion.div
          key={group.section}
          variants={itemVariants}
          id={`section-${group.section}`}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            {group.icon}
            <h2 className="text-lg font-semibold text-foreground">{group.section}</h2>
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {group.items.length} endpoint{group.items.length > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="space-y-3">
            {group.items.map((ep) => (
              <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
            ))}
          </div>
        </motion.div>
      ))}

      {/* ----------------------------------------------------------------- */}
      {/* Error Codes */}
      {/* ----------------------------------------------------------------- */}
      <motion.div variants={itemVariants} id="error-codes" className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-foreground">Codigos de erro</h2>
        </div>

        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Codigo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descricao</th>
              </tr>
            </thead>
            <tbody>
              {errorCodes.map((err) => (
                <tr key={err.code} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold ${
                        err.code < 500
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border border-red-500/30 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {err.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground/80">{err.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{err.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Emission Flow */}
      {/* ----------------------------------------------------------------- */}
      <motion.div variants={itemVariants} id="emission-flow" className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-foreground">Fluxo de emissao</h2>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-5 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O fluxo completo de emissao de NFS-e via API segue 4 etapas:
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
            {[
              {
                step: "1",
                title: "Criar rascunho",
                desc: "POST /nfse",
                color: "violet",
              },
              {
                step: "2",
                title: "Emitir",
                desc: "POST /nfse/{id}/emitir",
                color: "violet",
              },
              {
                step: "3",
                title: "Polling",
                desc: "GET /nfse/{id}",
                color: "amber",
              },
              {
                step: "4",
                title: "Download XML",
                desc: "GET /nfse/{id}/xml",
                color: "emerald",
              },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-0 sm:flex-1">
                <div className="flex-1 sm:flex-auto">
                  <div
                    className={`rounded-xl border p-4 text-center ${
                      s.color === "violet"
                        ? "border-violet-500/30 bg-violet-500/5"
                        : s.color === "amber"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-emerald-500/30 bg-emerald-500/5"
                    }`}
                  >
                    <div
                      className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        s.color === "violet"
                          ? "bg-violet-600/20 text-violet-400"
                          : s.color === "amber"
                            ? "bg-amber-600/20 text-amber-400"
                            : "bg-emerald-600/20 text-emerald-400"
                      }`}
                    >
                      {s.step}
                    </div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
                {i < 3 && (
                  <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <Zap className="h-4 w-4 mt-0.5 shrink-0 text-violet-400" />
            <div className="text-xs text-violet-200/80 leading-relaxed space-y-1">
              <p>
                <span className="font-medium text-violet-300">Polling:</span> Apos enfileirar a emissao, o
                status muda de <code className="font-mono">pendente</code> para{" "}
                <code className="font-mono">processando</code> e depois para{" "}
                <code className="font-mono">autorizada</code> ou{" "}
                <code className="font-mono">rejeitada</code>. Recomendamos polling a cada 5 segundos com
                timeout de 2 minutos.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Footer */}
      {/* ----------------------------------------------------------------- */}
      <motion.div variants={itemVariants} className="text-center">
        <p className="text-xs text-muted-foreground">
          Nexus NFE API v1 &mdash; Documentacao atualizada em abril de 2026
        </p>
      </motion.div>
    </motion.div>
  );
}
