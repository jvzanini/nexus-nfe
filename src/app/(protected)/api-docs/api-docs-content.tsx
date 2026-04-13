"use client";

import { useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Minus,
  ChevronDown,
  ChevronRight,
  Key,
  Zap,
  Shield,
  BookOpen,
  Terminal,
  Globe,
  Lightbulb,
  ArrowRight,
  Clock,
  Users,
  BarChart3,
  Settings,
  FileText,
  Lock,
  AlertTriangle,
  Hash,
  Server,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
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

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
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
  tip?: string;
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
  PUT: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  DELETE: "border-red-500/30 bg-red-500/10 text-red-400",
};

const langLabels: Record<Language, string> = {
  curl: "cURL",
  javascript: "JavaScript",
  python: "Python",
};

// ---------------------------------------------------------------------------
// JSON Syntax Highlighting
// ---------------------------------------------------------------------------

function highlightJson(json: string): ReactNode {
  const lines = json.split("\n");

  return lines.map((line, lineIdx) => {
    const parts: ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Comments
      const commentMatch = remaining.match(/^(\s*)(\/\/.*)/);
      if (commentMatch) {
        if (commentMatch[1]) parts.push(commentMatch[1]);
        parts.push(
          <span key={`c-${lineIdx}-${keyIdx++}`} className="text-zinc-600 italic">
            {commentMatch[2]}
          </span>
        );
        remaining = "";
        break;
      }

      // Leading whitespace
      const wsMatch = remaining.match(/^(\s+)/);
      if (wsMatch) {
        parts.push(wsMatch[1]);
        remaining = remaining.slice(wsMatch[1].length);
        continue;
      }

      // Brackets and braces
      const bracketMatch = remaining.match(/^([{}\[\],:])/);
      if (bracketMatch) {
        parts.push(
          <span key={`b-${lineIdx}-${keyIdx++}`} className="text-zinc-500">
            {bracketMatch[1]}
          </span>
        );
        remaining = remaining.slice(1);
        // Space after colon
        if (bracketMatch[1] === ":" && remaining.startsWith(" ")) {
          parts.push(" ");
          remaining = remaining.slice(1);
        }
        continue;
      }

      // JSON key (string before colon)
      const keyMatch = remaining.match(/^("(?:[^"\\]|\\.)*")(\s*:)/);
      if (keyMatch) {
        parts.push(
          <span key={`k-${lineIdx}-${keyIdx++}`} className="text-violet-400">
            {keyMatch[1]}
          </span>
        );
        remaining = remaining.slice(keyMatch[1].length);
        continue;
      }

      // String value
      const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*")/);
      if (strMatch) {
        parts.push(
          <span key={`s-${lineIdx}-${keyIdx++}`} className="text-emerald-400">
            {strMatch[1]}
          </span>
        );
        remaining = remaining.slice(strMatch[1].length);
        continue;
      }

      // Number
      const numMatch = remaining.match(/^(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/);
      if (numMatch) {
        parts.push(
          <span key={`n-${lineIdx}-${keyIdx++}`} className="text-amber-400">
            {numMatch[1]}
          </span>
        );
        remaining = remaining.slice(numMatch[1].length);
        continue;
      }

      // Boolean / null
      const boolMatch = remaining.match(/^(true|false|null)/);
      if (boolMatch) {
        parts.push(
          <span key={`bl-${lineIdx}-${keyIdx++}`} className="text-sky-400">
            {boolMatch[1]}
          </span>
        );
        remaining = remaining.slice(boolMatch[1].length);
        continue;
      }

      // Fallback: consume one char
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return (
      <span key={`line-${lineIdx}`}>
        {parts}
        {lineIdx < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------

function CodeBlock({
  code,
  languages,
  highlight = false,
}: {
  code: Record<Language, string> | string;
  languages?: Language[];
  highlight?: boolean;
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
    <div className="group rounded-lg border border-border bg-zinc-950 overflow-hidden">
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
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
      <div className="relative">
        {(!isMulti || langs.length <= 1) && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 opacity-0 transition-all hover:text-zinc-300 group-hover:opacity-100"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
          <code className="font-mono text-zinc-300">
            {highlight ? highlightJson(currentCode) : currentCode}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tip / Callout
// ---------------------------------------------------------------------------

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
      <div className="text-xs text-amber-200/80 leading-relaxed">{children}</div>
    </div>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
      <div className="text-xs text-red-200/80 leading-relaxed">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EndpointCard
// ---------------------------------------------------------------------------

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden transition-colors hover:border-border/80">
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
          className={`inline-flex w-14 items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${methodColors[endpoint.method]}`}
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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {endpoint.description}
              </p>

              {endpoint.tip && <Tip>{endpoint.tip}</Tip>}

              {endpoint.params && endpoint.params.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Par&acirc;metros
                  </h4>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Nome
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Tipo
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                            Obrig.
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Descri&ccedil;&atilde;o
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.params.map((p) => (
                          <tr
                            key={p.name}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-3 py-2 font-mono text-xs text-violet-400">
                              {p.name}
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                                {p.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {p.required ? (
                                <CheckCircle2 className="inline h-4 w-4 text-emerald-400" />
                              ) : (
                                <Minus className="inline h-4 w-4 text-zinc-600" />
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {p.description}
                            </td>
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
                  <CodeBlock code={endpoint.body} highlight />
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Exemplo de requisi&ccedil;&atilde;o
                </h4>
                <CodeBlock code={endpoint.examples} />
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Resposta
                </h4>
                <CodeBlock code={endpoint.response} highlight />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = "https://nfe.nexusai360.com/api/v1";

function curl(method: HttpMethod, path: string, body?: string) {
  const parts = [
    `curl -X ${method} "${BASE}${path}"`,
    `  -H "X-API-Key: sua_api_key"`,
  ];
  if (body) {
    parts.push(`  -H "Content-Type: application/json"`);
    parts.push(`  -d '${body}'`);
  }
  return parts.join(" \\\n");
}

function js(method: HttpMethod, path: string, body?: string) {
  const opts = [
    `  method: "${method}"`,
    `  headers: {\n    "X-API-Key": "sua_api_key"${body ? ',\n    "Content-Type": "application/json"' : ""}\n  }`,
  ];
  if (body) opts.push(`  body: JSON.stringify(${body})`);
  return `const res = await fetch("${BASE}${path}", {\n${opts.join(",\n")}\n});\nconst data = await res.json();`;
}

function py(method: HttpMethod, path: string, body?: string) {
  const lines = [
    "import requests",
    "",
    `headers = {"X-API-Key": "sua_api_key"}`,
  ];
  if (body) {
    lines.push(`payload = ${body}`);
    lines.push(
      `res = requests.${method.toLowerCase()}("${BASE}${path}", headers=headers, json=payload)`
    );
  } else {
    lines.push(
      `res = requests.${method.toLowerCase()}("${BASE}${path}", headers=headers)`
    );
  }
  lines.push("data = res.json()");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Section navigation data
// ---------------------------------------------------------------------------

const sections = [
  { id: "intro", label: "In\u00edcio", icon: BookOpen },
  { id: "auth", label: "Autentica\u00e7\u00e3o", icon: Key },
  { id: "concepts", label: "Conceitos", icon: FileText },
  { id: "flow", label: "Fluxo de emiss\u00e3o", icon: Zap },
  { id: "section-nfse", label: "NFS-e", icon: Zap },
  { id: "section-clientes", label: "Clientes MEI", icon: Globe },
  { id: "section-usuarios", label: "Usu\u00e1rios", icon: Users },
  { id: "section-relatorios", label: "Relat\u00f3rios", icon: BarChart3 },
  { id: "section-catalogo", label: "Cat\u00e1logo", icon: BookOpen },
  { id: "section-configuracoes", label: "Configura\u00e7\u00f5es", icon: Settings },
  { id: "errors", label: "C\u00f3digos de erro", icon: AlertTriangle },
  { id: "rate-limits", label: "Rate limits", icon: Gauge },
];

// ---------------------------------------------------------------------------
// Endpoint data
// ---------------------------------------------------------------------------

const endpointGroups: {
  id: string;
  section: string;
  icon: ReactNode;
  items: Endpoint[];
}[] = [
  {
    id: "section-nfse",
    section: "NFS-e",
    icon: <Zap className="h-4 w-4 text-violet-400" />,
    items: [
      {
        method: "GET",
        path: "/nfse",
        title: "Listar notas fiscais",
        description:
          "Retorna uma lista paginada de notas fiscais do tenant autenticado. Suporta filtros por status, busca textual por nome do cliente ou tomador, e ordena\u00e7\u00e3o por data de cria\u00e7\u00e3o. Ideal para construir pain\u00e9is de acompanhamento e relat\u00f3rios customizados.",
        tip: "Use o par\u00e2metro status para filtrar apenas notas autorizadas ao gerar relat\u00f3rios. Combine com q para buscas r\u00e1pidas por nome de cliente.",
        params: [
          { name: "page", type: "number", required: false, description: "P\u00e1gina (default: 1)" },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Itens por p\u00e1gina (default: 20, max: 100)",
          },
          {
            name: "status",
            type: "string",
            required: false,
            description:
              "Filtrar por status: rascunho, pendente, processando, autorizada, rejeitada, cancelada",
          },
          {
            name: "q",
            type: "string",
            required: false,
            description: "Busca por cliente, tomador ou n\u00famero",
          },
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
                clienteNome: "Jo\u00e3o Silva MEI",
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
          "Cria um rascunho de NFS-e com numera\u00e7\u00e3o autom\u00e1tica de DPS. O rascunho pode ser editado livremente antes de ser enviado para emiss\u00e3o. A numera\u00e7\u00e3o sequencial \u00e9 reservada atomicamente no momento da cria\u00e7\u00e3o.",
        tip: "O rascunho n\u00e3o tem validade \u2014 voc\u00ea pode cri\u00e1-lo agora e emitir depois. Aproveite para validar os dados com o cliente antes de prosseguir.",
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
          curl: curl(
            "POST",
            "/nfse",
            '{"clienteId":"clx1abc...","tomador":{...},"servico":{...}}'
          ),
          javascript: js(
            "POST",
            "/nfse",
            '{\n    clienteId: "clx1abc...",\n    tomador: { cpfCnpj: "12345678000199", razaoSocial: "Empresa XYZ Ltda" },\n    servico: { descricao: "Desenvolvimento de software", valorServico: 1500 }\n  }'
          ),
          python: py(
            "POST",
            "/nfse",
            '{\n    "clienteId": "clx1abc...",\n    "tomador": {"cpfCnpj": "12345678000199", "razaoSocial": "Empresa XYZ Ltda"},\n    "servico": {"descricao": "Desenvolvimento de software", "valorServico": 1500}\n}'
          ),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx2def...",
              numero: 12,
              serie: "NFS",
              status: "rascunho",
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
        description:
          "Retorna todos os detalhes de uma NFS-e espec\u00edfica, incluindo dados do tomador, servi\u00e7o, timeline de status e chave de acesso. Use este endpoint para polling ap\u00f3s enfileirar uma emiss\u00e3o.",
        tip: "Ap\u00f3s chamar POST /nfse/{id}/emitir, fa\u00e7a polling neste endpoint a cada 5 segundos verificando o campo status at\u00e9 que ele mude para 'autorizada' ou 'rejeitada'.",
        params: [
          { name: "id", type: "string", required: true, description: "ID da NFS-e" },
        ],
        examples: {
          curl: curl("GET", "/nfse/clx2def..."),
          javascript: js("GET", "/nfse/clx2def..."),
          python: py("GET", "/nfse/clx2def..."),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx2def...",
              numero: 12,
              serie: "NFS",
              status: "autorizada",
              chaveAcesso: "NFSe123456789...",
              clienteNome: "Jo\u00e3o Silva MEI",
              tomador: {
                cpfCnpj: "12345678000199",
                razaoSocial: "Empresa XYZ Ltda",
              },
              servico: {
                descricao: "Desenvolvimento de software",
                valorServico: 1500.0,
                aliquotaIss: 2.0,
                valorIss: 30.0,
              },
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
        title: "Enfileirar para emiss\u00e3o",
        description:
          "Envia o rascunho para a fila de emiss\u00e3o via gov.br. O processamento \u00e9 ass\u00edncrono: o worker assina o XML com o certificado A1 do cliente, envia via mTLS e atualiza o status. Consulte o resultado via GET /nfse/{id}.",
        tip: "O cliente MEI precisa ter um certificado A1 v\u00e1lido cadastrado. Caso contr\u00e1rio, a requisi\u00e7\u00e3o retornar\u00e1 erro 422.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "ID da NFS-e (deve estar em status 'rascunho')",
          },
        ],
        examples: {
          curl: curl("POST", "/nfse/clx2def.../emitir"),
          javascript: js("POST", "/nfse/clx2def.../emitir"),
          python: py("POST", "/nfse/clx2def.../emitir"),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx2def...",
              status: "pendente",
              message: "NFS-e enfileirada para emiss\u00e3o",
            },
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
          "Cancela uma NFS-e autorizada junto \u00e0 SEFIN Nacional. O cancelamento s\u00f3 \u00e9 permitido dentro de 24 horas ap\u00f3s a emiss\u00e3o. Um motivo descritivo \u00e9 obrigat\u00f3rio e ser\u00e1 registrado no sistema nacional.",
        tip: "Ap\u00f3s 24 horas, a \u00fanica op\u00e7\u00e3o \u00e9 a substitui\u00e7\u00e3o via POST /nfse/{id}/substituir. Planeje cancelamentos com anteced\u00eancia.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "ID da NFS-e (deve estar autorizada, dentro de 24h)",
          },
        ],
        body: JSON.stringify({ motivo: "Erro nos dados do tomador" }, null, 2),
        examples: {
          curl: curl(
            "POST",
            "/nfse/clx2def.../cancelar",
            '{"motivo":"Erro nos dados do tomador"}'
          ),
          javascript: js(
            "POST",
            "/nfse/clx2def.../cancelar",
            '{ motivo: "Erro nos dados do tomador" }'
          ),
          python: py(
            "POST",
            "/nfse/clx2def.../cancelar",
            '{"motivo": "Erro nos dados do tomador"}'
          ),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx2def...",
              status: "cancelada",
              canceladaAt: "2026-04-11T10:00:00Z",
            },
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/nfse/{id}/substituir",
        title: "Criar nota substituta",
        description:
          "Cria um novo rascunho de NFS-e como substitui\u00e7\u00e3o de uma nota autorizada. O rascunho \u00e9 pr\u00e9-preenchido com os dados da nota original e vinculado a ela pelo campo substitutaDe. Use quando o prazo de 24h para cancelamento j\u00e1 expirou.",
        tip: "A nota original continua v\u00e1lida at\u00e9 que a substituta seja emitida e autorizada. Revise os dados do rascunho antes de emitir.",
        params: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "ID da NFS-e original (deve estar autorizada)",
          },
        ],
        examples: {
          curl: curl("POST", "/nfse/clx2def.../substituir"),
          javascript: js("POST", "/nfse/clx2def.../substituir"),
          python: py("POST", "/nfse/clx2def.../substituir"),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx9xyz...",
              status: "rascunho",
              substitutaDe: "clx2def...",
              numero: 13,
              createdAt: "2026-04-12T15:00:00Z",
            },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/nfse/{id}/xml",
        title: "Download do XML",
        description:
          "Retorna o XML assinado e autorizado da NFS-e. Dispon\u00edvel apenas para notas com status autorizada ou cancelada. O conte\u00fado \u00e9 retornado com Content-Type application/xml.",
        tip: "Armazene o XML localmente para fins de auditoria. A legisla\u00e7\u00e3o exige a guarda por no m\u00ednimo 5 anos.",
        params: [
          { name: "id", type: "string", required: true, description: "ID da NFS-e" },
        ],
        examples: {
          curl: curl("GET", "/nfse/clx2def.../xml"),
          javascript: js("GET", "/nfse/clx2def.../xml"),
          python: py("GET", "/nfse/clx2def.../xml"),
        },
        response: `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse">
  <!-- XML autorizado da NFS-e -->
  <infNFSe Id="NFSe123456789...">
    <emit>...</emit>
    <tomador>...</tomador>
    <servico>...</servico>
  </infNFSe>
  <Signature>...</Signature>
</NFSe>`,
      },
    ],
  },
  {
    id: "section-clientes",
    section: "Clientes MEI",
    icon: <Globe className="h-4 w-4 text-emerald-400" />,
    items: [
      {
        method: "GET",
        path: "/clientes",
        title: "Listar clientes MEI",
        description:
          "Retorna a lista paginada de clientes MEI cadastrados no tenant. Inclui status do certificado digital e indica\u00e7\u00e3o de atividade. Use para montar seletores de cliente em integra\u00e7\u00f5es.",
        params: [
          { name: "page", type: "number", required: false, description: "P\u00e1gina (default: 1)" },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Itens por p\u00e1gina (default: 20)",
          },
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
                razaoSocial: "Jo\u00e3o Silva MEI",
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
        method: "POST",
        path: "/clientes",
        title: "Cadastrar cliente MEI",
        description:
          "Cadastra um novo cliente MEI na plataforma. Os dados s\u00e3o validados automaticamente via consulta \u00e0 BrasilAPI (CNPJ, raz\u00e3o social, endere\u00e7o). O certificado A1 pode ser enviado depois via upload na interface.",
        tip: "O CNPJ informado ser\u00e1 consultado na BrasilAPI para preencher automaticamente raz\u00e3o social, nome fantasia e endere\u00e7o. Informe apenas o CNPJ para aproveitar o auto-preenchimento.",
        body: JSON.stringify(
          {
            cnpj: "12345678000199",
            razaoSocial: "Jo\u00e3o Silva MEI",
            nomeFantasia: "JS Tecnologia",
            email: "joao@email.com",
            telefone: "11999998888",
          },
          null,
          2
        ),
        examples: {
          curl: curl(
            "POST",
            "/clientes",
            '{"cnpj":"12345678000199","razaoSocial":"Jo\u00e3o Silva MEI","email":"joao@email.com"}'
          ),
          javascript: js(
            "POST",
            "/clientes",
            '{\n    cnpj: "12345678000199",\n    razaoSocial: "Jo\u00e3o Silva MEI",\n    email: "joao@email.com"\n  }'
          ),
          python: py(
            "POST",
            "/clientes",
            '{"cnpj": "12345678000199", "razaoSocial": "Jo\u00e3o Silva MEI", "email": "joao@email.com"}'
          ),
        },
        response: JSON.stringify(
          {
            data: {
              id: "clx3ghi...",
              cnpj: "12345678000199",
              razaoSocial: "Jo\u00e3o Silva MEI",
              nomeFantasia: "JS Tecnologia",
              ativo: true,
              createdAt: "2026-04-12T10:00:00Z",
            },
          },
          null,
          2
        ),
      },
      {
        method: "GET",
        path: "/clientes/{id}",
        title: "Detalhes do cliente",
        description:
          "Retorna os detalhes completos de um cliente MEI, incluindo status e validade do certificado digital A1, dados de faturamento anual acumulado e percentual do limite MEI (R$ 81.000).",
        params: [
          { name: "id", type: "string", required: true, description: "ID do cliente" },
        ],
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
              razaoSocial: "Jo\u00e3o Silva MEI",
              nomeFantasia: "JS Tecnologia",
              email: "joao@email.com",
              ativo: true,
              certificado: {
                valido: true,
                expiraEm: "2027-01-15T00:00:00Z",
                diasRestantes: 278,
              },
              faturamento: {
                ano: 2026,
                total: 45000,
                limite: 81000,
                percentual: 55.56,
                faixa: "ok",
              },
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
          "Retorna o faturamento acumulado do ano para o cliente MEI, com faixas graduais de alerta baseadas no limite anual de R$ 81.000. As faixas s\u00e3o: ok (\u226480%), aten\u00e7\u00e3o (80-100%), alerta (100-120%) e bloqueado (>120%).",
        tip: "Monitore a faixa 'aten\u00e7\u00e3o' para alertar seus clientes antes que atinjam o limite. Acima de 120%, a emiss\u00e3o \u00e9 bloqueada automaticamente pela plataforma.",
        params: [
          { name: "id", type: "string", required: true, description: "ID do cliente" },
          {
            name: "ano",
            type: "number",
            required: false,
            description: "Ano de refer\u00eancia (default: ano atual)",
          },
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
    id: "section-usuarios",
    section: "Usu\u00e1rios",
    icon: <Users className="h-4 w-4 text-sky-400" />,
    items: [
      {
        method: "GET",
        path: "/usuarios",
        title: "Listar usu\u00e1rios",
        description:
          "Retorna a lista de usu\u00e1rios cadastrados na plataforma com seus respectivos papeis (admin, operador). Apenas administradores podem acessar este endpoint.",
        params: [
          { name: "page", type: "number", required: false, description: "P\u00e1gina (default: 1)" },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Itens por p\u00e1gina (default: 20)",
          },
        ],
        examples: {
          curl: curl("GET", "/usuarios?page=1&limit=20"),
          javascript: js("GET", "/usuarios?page=1&limit=20"),
          python: py("GET", "/usuarios?page=1&limit=20"),
        },
        response: JSON.stringify(
          {
            data: [
              {
                id: "usr_abc...",
                name: "Maria Oliveira",
                email: "maria@empresa.com",
                role: "admin",
                createdAt: "2026-01-15T10:00:00Z",
              },
            ],
            meta: { page: 1, limit: 20, total: 3 },
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/usuarios",
        title: "Criar usu\u00e1rio",
        description:
          "Cria um novo usu\u00e1rio na plataforma. Um e-mail de boas-vindas com link para definir a senha ser\u00e1 enviado automaticamente. Apenas administradores podem criar usu\u00e1rios.",
        tip: "O usu\u00e1rio receber\u00e1 um e-mail para definir sua senha. O link expira em 24 horas.",
        body: JSON.stringify(
          {
            name: "Carlos Santos",
            email: "carlos@empresa.com",
            role: "operador",
          },
          null,
          2
        ),
        examples: {
          curl: curl(
            "POST",
            "/usuarios",
            '{"name":"Carlos Santos","email":"carlos@empresa.com","role":"operador"}'
          ),
          javascript: js(
            "POST",
            "/usuarios",
            '{\n    name: "Carlos Santos",\n    email: "carlos@empresa.com",\n    role: "operador"\n  }'
          ),
          python: py(
            "POST",
            "/usuarios",
            '{"name": "Carlos Santos", "email": "carlos@empresa.com", "role": "operador"}'
          ),
        },
        response: JSON.stringify(
          {
            data: {
              id: "usr_xyz...",
              name: "Carlos Santos",
              email: "carlos@empresa.com",
              role: "operador",
              createdAt: "2026-04-12T10:00:00Z",
            },
          },
          null,
          2
        ),
      },
    ],
  },
  {
    id: "section-relatorios",
    section: "Relat\u00f3rios",
    icon: <BarChart3 className="h-4 w-4 text-amber-400" />,
    items: [
      {
        method: "GET",
        path: "/relatorios/emissao",
        title: "Relat\u00f3rio de emiss\u00f5es",
        description:
          "Retorna um relat\u00f3rio consolidado de emiss\u00f5es de NFS-e por per\u00edodo. Inclui totais por status, valor total emitido, quantidade de notas e distribui\u00e7\u00e3o por cliente. Ideal para dashboards e relat\u00f3rios gerenciais.",
        tip: "O per\u00edodo m\u00e1ximo por consulta \u00e9 de 90 dias. Para per\u00edodos maiores, fa\u00e7a m\u00faltiplas requisi\u00e7\u00f5es.",
        params: [
          {
            name: "dataInicio",
            type: "string",
            required: true,
            description: "Data de in\u00edcio (formato ISO: YYYY-MM-DD)",
          },
          {
            name: "dataFim",
            type: "string",
            required: true,
            description: "Data final (formato ISO: YYYY-MM-DD)",
          },
          {
            name: "clienteId",
            type: "string",
            required: false,
            description: "Filtrar por cliente espec\u00edfico",
          },
        ],
        examples: {
          curl: curl(
            "GET",
            "/relatorios/emissao?dataInicio=2026-01-01&dataFim=2026-03-31"
          ),
          javascript: js(
            "GET",
            "/relatorios/emissao?dataInicio=2026-01-01&dataFim=2026-03-31"
          ),
          python: py(
            "GET",
            "/relatorios/emissao?dataInicio=2026-01-01&dataFim=2026-03-31"
          ),
        },
        response: JSON.stringify(
          {
            data: {
              periodo: {
                inicio: "2026-01-01",
                fim: "2026-03-31",
              },
              totais: {
                emitidas: 128,
                valorTotal: 192000.0,
                canceladas: 3,
                rejeitadas: 1,
              },
              porCliente: [
                {
                  clienteId: "clx3ghi...",
                  razaoSocial: "Jo\u00e3o Silva MEI",
                  quantidade: 45,
                  valorTotal: 67500.0,
                },
              ],
            },
          },
          null,
          2
        ),
      },
    ],
  },
  {
    id: "section-catalogo",
    section: "Cat\u00e1logo",
    icon: <BookOpen className="h-4 w-4 text-amber-400" />,
    items: [
      {
        method: "GET",
        path: "/catalogo/nbs",
        title: "Buscar c\u00f3digos NBS",
        description:
          "Busca c\u00f3digos NBS (Nomenclatura Brasileira de Servi\u00e7os) da LC 116/2003 por c\u00f3digo ou descri\u00e7\u00e3o. O cat\u00e1logo cont\u00e9m aproximadamente 580 c\u00f3digos de tributa\u00e7\u00e3o com al\u00edquotas m\u00ednimas e m\u00e1ximas de ISS.",
        tip: "Use este endpoint para construir campos de autocomplete no seu sistema. A busca \u00e9 case-insensitive e aceita buscas parciais.",
        params: [
          {
            name: "q",
            type: "string",
            required: true,
            description: "Termo de busca (c\u00f3digo ou descri\u00e7\u00e3o)",
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "M\u00e1x. resultados (default: 20)",
          },
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
                descricao: "An\u00e1lise e desenvolvimento de sistemas",
                aliquotaMinima: 2.0,
                aliquotaMaxima: 5.0,
              },
              {
                codigo: "1.0102",
                descricao: "Programa\u00e7\u00e3o",
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
  {
    id: "section-configuracoes",
    section: "Configura\u00e7\u00f5es",
    icon: <Settings className="h-4 w-4 text-zinc-400" />,
    items: [
      {
        method: "GET",
        path: "/configuracoes",
        title: "Ler configura\u00e7\u00f5es",
        description:
          "Retorna as configura\u00e7\u00f5es globais da plataforma, incluindo ambiente de emiss\u00e3o (homologa\u00e7\u00e3o ou produ\u00e7\u00e3o), prefer\u00eancias de notifica\u00e7\u00e3o e dados do tenant.",
        examples: {
          curl: curl("GET", "/configuracoes"),
          javascript: js("GET", "/configuracoes"),
          python: py("GET", "/configuracoes"),
        },
        response: JSON.stringify(
          {
            data: {
              ambiente: "producao_restrita",
              notificacoesEmail: true,
              tenantNome: "Minha Contabilidade",
              limiteReqMin: 60,
            },
          },
          null,
          2
        ),
      },
      {
        method: "POST",
        path: "/configuracoes",
        title: "Atualizar configura\u00e7\u00e3o",
        description:
          "Atualiza uma configura\u00e7\u00e3o espec\u00edfica da plataforma. Apenas administradores podem alterar configura\u00e7\u00f5es. A altera\u00e7\u00e3o de ambiente (homologa\u00e7\u00e3o para produ\u00e7\u00e3o) requer permiss\u00e3o super_admin.",
        tip: "A mudan\u00e7a de ambiente para produ\u00e7\u00e3o \u00e9 irrevers\u00edvel via API. Tenha certeza absoluta antes de prosseguir.",
        body: JSON.stringify(
          {
            chave: "notificacoesEmail",
            valor: false,
          },
          null,
          2
        ),
        examples: {
          curl: curl(
            "POST",
            "/configuracoes",
            '{"chave":"notificacoesEmail","valor":false}'
          ),
          javascript: js(
            "POST",
            "/configuracoes",
            '{\n    chave: "notificacoesEmail",\n    valor: false\n  }'
          ),
          python: py(
            "POST",
            "/configuracoes",
            '{"chave": "notificacoesEmail", "valor": false}'
          ),
        },
        response: JSON.stringify(
          {
            data: {
              chave: "notificacoesEmail",
              valor: false,
              atualizadoEm: "2026-04-12T10:00:00Z",
            },
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
  {
    code: 400,
    name: "Bad Request",
    description:
      "Corpo da requisi\u00e7\u00e3o inv\u00e1lido ou par\u00e2metros ausentes",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  {
    code: 401,
    name: "Unauthorized",
    description: "API Key ausente ou inv\u00e1lida",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  {
    code: 403,
    name: "Forbidden",
    description:
      "Sem permiss\u00e3o para acessar este recurso (ex: operador tentando alterar configura\u00e7\u00f5es de admin)",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  {
    code: 404,
    name: "Not Found",
    description: "Recurso n\u00e3o encontrado",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  {
    code: 409,
    name: "Conflict",
    description:
      "Conflito de estado (ex: tentar emitir nota j\u00e1 emitida ou cancelar nota j\u00e1 cancelada)",
    color: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  },
  {
    code: 422,
    name: "Unprocessable Entity",
    description:
      "Dados v\u00e1lidos sintaticamente, mas regra de neg\u00f3cio impede a opera\u00e7\u00e3o (ex: certificado expirado, limite MEI ultrapassado)",
    color: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  },
  {
    code: 429,
    name: "Too Many Requests",
    description:
      "Limite de requisi\u00e7\u00f5es excedido \u2014 aguarde antes de tentar novamente",
    color: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  {
    code: 500,
    name: "Internal Server Error",
    description: "Erro interno do servidor \u2014 tente novamente ou entre em contato com o suporte",
    color: "border-red-500/30 bg-red-500/10 text-red-400",
  },
];

// ---------------------------------------------------------------------------
// SideNav
// ---------------------------------------------------------------------------

function SideNav({ activeSection }: { activeSection: string }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="space-y-0.5">
      {sections.map((s) => {
        const Icon = s.icon;
        const isActive = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              isActive
                ? "bg-violet-600/10 text-violet-400 font-medium"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Concepts data
// ---------------------------------------------------------------------------

const concepts = [
  {
    title: "O que \u00e9 NFS-e",
    icon: <FileText className="h-4 w-4 text-violet-400" />,
    content:
      "A Nota Fiscal de Servi\u00e7o Eletr\u00f4nica (NFS-e) \u00e9 o documento fiscal digital que registra a presta\u00e7\u00e3o de servi\u00e7os. Desde 2023, o Sistema Nacional NFS-e unifica a emiss\u00e3o em todo o Brasil atrav\u00e9s da API do gov.br, substituindo os sistemas municipais isolados.",
  },
  {
    title: "S\u00e9rie e n\u00famero do DPS",
    icon: <Hash className="h-4 w-4 text-emerald-400" />,
    content:
      "O DPS (Declara\u00e7\u00e3o de Presta\u00e7\u00e3o de Servi\u00e7os) \u00e9 o documento enviado ao gov.br para solicitar a emiss\u00e3o da NFS-e. Cada DPS tem uma s\u00e9rie (fixada em 'NFS') e um n\u00famero sequencial \u00fanico por emitente. A numera\u00e7\u00e3o \u00e9 reservada atomicamente pela plataforma.",
  },
  {
    title: "Homologa\u00e7\u00e3o vs Produ\u00e7\u00e3o",
    icon: <Server className="h-4 w-4 text-amber-400" />,
    content:
      "O ambiente de homologa\u00e7\u00e3o (produ\u00e7\u00e3o restrita) permite testar a emiss\u00e3o sem efeito fiscal real. J\u00e1 o ambiente de produ\u00e7\u00e3o gera notas fiscais v\u00e1lidas. A plataforma come\u00e7a em homologa\u00e7\u00e3o por padr\u00e3o \u2014 a mudan\u00e7a para produ\u00e7\u00e3o requer confirma\u00e7\u00e3o expl\u00edcita.",
  },
  {
    title: "Certificado Digital A1",
    icon: <Lock className="h-4 w-4 text-sky-400" />,
    content:
      "O certificado digital A1 (arquivo .pfx/.p12) \u00e9 obrigat\u00f3rio para assinar o XML e autenticar via mTLS com o gov.br. Cada cliente MEI deve ter seu pr\u00f3prio certificado cadastrado na plataforma. A chave privada \u00e9 armazenada cifrada com AES-256-GCM.",
  },
  {
    title: "Limite anual MEI (R$ 81.000)",
    icon: <Gauge className="h-4 w-4 text-red-400" />,
    content:
      "O MEI tem um limite de faturamento anual de R$ 81.000. A plataforma monitora automaticamente o faturamento acumulado e aplica faixas graduais: ok (\u226480%), aten\u00e7\u00e3o (80-100%), alerta (100-120%) e bloqueio (>120%). Acima de 120%, a emiss\u00e3o \u00e9 bloqueada.",
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ApiDocsContent() {
  const [activeSection, setActiveSection] = useState("intro");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    const sectionIds = sections.map((s) => s.id);
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex gap-8">
      {/* Sticky side navigation */}
      <div className="hidden xl:block w-56 shrink-0">
        <div className="sticky top-24 space-y-2">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
            Navega\u00e7\u00e3o
          </p>
          <SideNav activeSection={activeSection} />
        </div>
      </div>

      {/* Main content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-w-0 flex-1 space-y-12 pb-16"
      >
        {/* --------------------------------------------------------------- */}
        {/* Hero */}
        {/* --------------------------------------------------------------- */}
        <motion.div variants={itemVariants} id="intro" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10 border border-violet-500/20">
              <Code2 className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                API REST v1
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Integre a emiss\u00e3o de NFS-e diretamente no seu sistema com 17 endpoints
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-zinc-900/60 px-4 py-2 font-mono text-sm text-zinc-300">
              <Terminal className="h-4 w-4 text-violet-400" />
              {BASE}
            </span>
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            >
              v1.0
            </Badge>
            <Badge
              variant="secondary"
              className="bg-violet-500/10 text-violet-400 border-violet-500/20"
            >
              REST + JSON
            </Badge>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Autentica\u00e7\u00e3o", id: "auth", icon: <Key className="h-3 w-3" /> },
              { label: "NFS-e", id: "section-nfse", icon: <Zap className="h-3 w-3" /> },
              { label: "Clientes", id: "section-clientes", icon: <Globe className="h-3 w-3" /> },
              { label: "Usu\u00e1rios", id: "section-usuarios", icon: <Users className="h-3 w-3" /> },
              { label: "Relat\u00f3rios", id: "section-relatorios", icon: <BarChart3 className="h-3 w-3" /> },
              { label: "Cat\u00e1logo", id: "section-catalogo", icon: <BookOpen className="h-3 w-3" /> },
              { label: "Configura\u00e7\u00f5es", id: "section-configuracoes", icon: <Settings className="h-3 w-3" /> },
              { label: "Erros", id: "errors", icon: <AlertTriangle className="h-3 w-3" /> },
              { label: "Rate limits", id: "rate-limits", icon: <Gauge className="h-3 w-3" /> },
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

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Authentication */}
        {/* --------------------------------------------------------------- */}
        <motion.div variants={itemVariants} id="auth" className="space-y-5">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-foreground">
              Autentica\u00e7\u00e3o
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-6 space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Todas as requisi\u00e7\u00f5es devem incluir o header{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-violet-400">
                X-API-Key
              </code>{" "}
              com sua chave de API. Chaves s\u00e3o geradas na p\u00e1gina de{" "}
              <span className="text-foreground font-medium">
                Configura\u00e7\u00f5es
              </span>{" "}
              da plataforma. Cada chave \u00e9 vinculada a um tenant e herda suas
              permiss\u00f5es.
            </p>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Como gerar sua API Key
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  Acesse{" "}
                  <span className="text-foreground font-medium">
                    Configura\u00e7\u00f5es
                  </span>{" "}
                  no menu lateral
                </li>
                <li>
                  Na se\u00e7\u00e3o{" "}
                  <span className="text-foreground font-medium">API Keys</span>,
                  clique em{" "}
                  <span className="text-foreground font-medium">
                    Gerar nova chave
                  </span>
                </li>
                <li>
                  Copie a chave gerada \u2014 ela s\u00f3 ser\u00e1 exibida uma vez
                </li>
                <li>
                  Adicione o header{" "}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-violet-400">
                    X-API-Key
                  </code>{" "}
                  em todas as requisi\u00e7\u00f5es
                </li>
              </ol>
            </div>

            <CodeBlock
              code={`curl -H "X-API-Key: nxs_k1_abc123..." \\
  ${BASE}/nfse`}
            />

            <Warning>
              <p>
                <span className="font-medium text-red-300">
                  Mantenha sua API Key em segredo.
                </span>{" "}
                Nunca exponha em c\u00f3digo client-side, reposit\u00f3rios p\u00fablicos ou
                logs. Caso uma chave seja comprometida, revogue-a imediatamente
                nas Configura\u00e7\u00f5es e gere uma nova.
              </p>
            </Warning>
          </div>
        </motion.div>

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Concepts */}
        {/* --------------------------------------------------------------- */}
        <motion.div variants={itemVariants} id="concepts" className="space-y-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-400" />
            <h2 className="text-xl font-semibold text-foreground">Conceitos</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Antes de integrar, \u00e9 importante entender alguns conceitos
            fundamentais do ecossistema NFS-e e da plataforma.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {concepts.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-border bg-card/50 p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  {c.icon}
                  <h3 className="text-sm font-semibold text-foreground">
                    {c.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Response Format */}
        {/* --------------------------------------------------------------- */}
        <motion.div variants={itemVariants} className="space-y-5">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-violet-400" />
            <h2 className="text-xl font-semibold text-foreground">
              Formato de resposta
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-6 space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Todas as respostas seguem um formato padronizado JSON. Sucesso
              retorna os dados em{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-emerald-400">
                data
              </code>
              . Erros retornam{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-red-400">
                error
              </code>{" "}
              com c\u00f3digo e mensagem descritiva.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                  Sucesso (200)
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
                  highlight
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">
                  Erro (4xx/5xx)
                </h4>
                <CodeBlock
                  code={JSON.stringify(
                    {
                      error: {
                        code: "VALIDATION_ERROR",
                        message:
                          "O campo 'tomador.cpfCnpj' \u00e9 obrigat\u00f3rio",
                        details: [
                          {
                            field: "tomador.cpfCnpj",
                            message: "Campo obrigat\u00f3rio",
                          },
                        ],
                      },
                    },
                    null,
                    2
                  )}
                  highlight
                />
              </div>
            </div>

            <Tip>
              Respostas paginadas incluem o objeto{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-zinc-300">
                meta
              </code>{" "}
              com{" "}
              <code className="font-mono text-zinc-300">page</code>,{" "}
              <code className="font-mono text-zinc-300">limit</code> e{" "}
              <code className="font-mono text-zinc-300">total</code>. Use esses
              valores para implementar navega\u00e7\u00e3o entre p\u00e1ginas.
            </Tip>
          </div>
        </motion.div>

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Emission Flow */}
        {/* --------------------------------------------------------------- */}
        <motion.div variants={itemVariants} id="flow" className="space-y-5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-400" />
            <h2 className="text-xl font-semibold text-foreground">
              Fluxo de emiss\u00e3o
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-6 space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              O fluxo completo de emiss\u00e3o de NFS-e via API segue 5 etapas.
              A emiss\u00e3o \u00e9 ass\u00edncrona \u2014 voc\u00ea enfileira o
              pedido e consulta o resultado via polling.
            </p>

            {/* Flow cards */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
              {[
                {
                  step: "1",
                  title: "Criar rascunho",
                  desc: "POST /nfse",
                  color: "violet" as const,
                },
                {
                  step: "2",
                  title: "Emitir",
                  desc: "POST /{id}/emitir",
                  color: "violet" as const,
                },
                {
                  step: "3",
                  title: "Worker processa",
                  desc: "autom\u00e1tico",
                  color: "amber" as const,
                },
                {
                  step: "4",
                  title: "Polling status",
                  desc: "GET /{id}",
                  color: "amber" as const,
                },
                {
                  step: "5",
                  title: "Download XML",
                  desc: "GET /{id}/xml",
                  color: "emerald" as const,
                },
              ].map((s, i) => (
                <div
                  key={s.step}
                  className="flex items-center gap-0 sm:flex-1"
                >
                  <div className="flex-1 sm:flex-auto">
                    <div
                      className={`rounded-xl border p-4 text-center h-full flex flex-col items-center justify-center ${
                        s.color === "violet"
                          ? "border-violet-500/30 bg-violet-500/5"
                          : s.color === "amber"
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-emerald-500/30 bg-emerald-500/5"
                      }`}
                    >
                      <div
                        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          s.color === "violet"
                            ? "bg-violet-600/20 text-violet-400"
                            : s.color === "amber"
                              ? "bg-amber-600/20 text-amber-400"
                              : "bg-emerald-600/20 text-emerald-400"
                        }`}
                      >
                        {s.step}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {s.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                  {i < 4 && (
                    <ArrowRight className="mx-1 h-4 w-4 shrink-0 text-zinc-600 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>

            <Tip>
              <span className="font-medium text-amber-300">Polling:</span>{" "}
              Ap\u00f3s enfileirar a emiss\u00e3o, o status muda de{" "}
              <code className="font-mono text-amber-300">pendente</code> para{" "}
              <code className="font-mono text-amber-300">processando</code> e
              depois para{" "}
              <code className="font-mono text-emerald-300">autorizada</code> ou{" "}
              <code className="font-mono text-red-300">rejeitada</code>.
              Recomendamos polling a cada 5 segundos com timeout de 2 minutos.
            </Tip>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Exemplo de polling em JavaScript
              </h4>
              <CodeBlock
                code={`async function aguardarEmissao(nfseId) {
  const maxTentativas = 24; // 2 minutos (24 x 5s)
  for (let i = 0; i < maxTentativas; i++) {
    const res = await fetch(\`${BASE}/nfse/\${nfseId}\`, {
      headers: { "X-API-Key": "sua_api_key" }
    });
    const { data } = await res.json();

    if (data.status === "autorizada") return data;
    if (data.status === "rejeitada") throw new Error(data.motivoRejeicao);

    await new Promise(r => setTimeout(r, 5000)); // Aguarda 5s
  }
  throw new Error("Timeout: emiss\u00e3o n\u00e3o conclu\u00edda em 2 minutos");
}`}
              />
            </div>
          </div>
        </motion.div>

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Endpoint sections */}
        {/* --------------------------------------------------------------- */}
        {endpointGroups.map((group) => (
          <motion.div
            key={group.id}
            variants={itemVariants}
            id={group.id}
            className="space-y-5"
          >
            <div className="flex items-center gap-2">
              {group.icon}
              <h2 className="text-xl font-semibold text-foreground">
                {group.section}
              </h2>
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {group.items.length} endpoint
                {group.items.length > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="space-y-3">
              {group.items.map((ep) => (
                <EndpointCard
                  key={`${ep.method}-${ep.path}`}
                  endpoint={ep}
                />
              ))}
            </div>
          </motion.div>
        ))}

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Error Codes */}
        {/* --------------------------------------------------------------- */}
        <motion.div variants={itemVariants} id="errors" className="space-y-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-xl font-semibold text-foreground">
              C\u00f3digos de erro
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            A API utiliza c\u00f3digos HTTP padr\u00e3o para indicar o resultado
            da requisi\u00e7\u00e3o. Erros 4xx indicam problema na
            requisi\u00e7\u00e3o do cliente, enquanto 5xx indicam falha no
            servidor.
          </p>

          <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">
                    C\u00f3digo
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-44">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Descri\u00e7\u00e3o
                  </th>
                </tr>
              </thead>
              <tbody>
                {errorCodes.map((err) => (
                  <tr
                    key={err.code}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold border ${err.color}`}
                      >
                        {err.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground/80">
                      {err.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {err.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Formato do corpo de erro
            </h4>
            <CodeBlock
              code={JSON.stringify(
                {
                  error: {
                    code: "CERTIFICATE_EXPIRED",
                    message:
                      "O certificado digital do cliente expirou em 2026-01-15",
                    details: [
                      {
                        field: "certificado",
                        message: "Certificado expirado",
                      },
                    ],
                  },
                },
                null,
                2
              )}
              highlight
            />
          </div>
        </motion.div>

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Rate Limits */}
        {/* --------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          id="rate-limits"
          className="space-y-5"
        >
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-foreground">
              Rate limits
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-6 space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              A API aplica limites de requisi\u00e7\u00f5es por minuto para
              garantir estabilidade e uso justo da plataforma. Os limites s\u00e3o
              aplicados por API Key.
            </p>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Plano
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Limite
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Janela
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-xs text-foreground font-medium">
                      Padr\u00e3o
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-violet-600/10 border border-violet-500/20 px-2 py-0.5 text-xs font-mono text-violet-400">
                        60 req/min
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      Sliding window de 1 minuto
                    </td>
                  </tr>
                  <tr className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-xs text-foreground font-medium">
                      Emiss\u00e3o (POST /nfse/*/emitir)
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-amber-600/10 border border-amber-500/20 px-2 py-0.5 text-xs font-mono text-amber-400">
                        10 req/min
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      Sliding window de 1 minuto
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Headers de rate limit
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Toda resposta inclui headers com informa\u00e7\u00f5es sobre seu
                consumo atual:
              </p>
              <CodeBlock
                code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1712930400`}
              />
            </div>

            <Tip>
              Ao receber um{" "}
              <code className="font-mono text-amber-300">429 Too Many Requests</code>,
              aguarde o tempo indicado no header{" "}
              <code className="font-mono text-amber-300">X-RateLimit-Reset</code>{" "}
              (timestamp Unix) antes de retransmitir. Implemente backoff
              exponencial para resili\u00eancia.
            </Tip>
          </div>
        </motion.div>

        <div className="h-px bg-border" />

        {/* --------------------------------------------------------------- */}
        {/* Footer */}
        {/* --------------------------------------------------------------- */}
        <motion.div variants={itemVariants} className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Nexus NFE API v1 &mdash; Documenta\u00e7\u00e3o atualizada em abril
            de 2026
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            17 endpoints &middot; REST + JSON &middot; Autentica\u00e7\u00e3o
            por API Key
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
