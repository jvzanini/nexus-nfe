"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSearch } from "@/components/layout/search-context";
import {
  Search,
  Loader2,
  Building2,
  FileText,
  User,
  Users,
  Code2,
} from "lucide-react";

interface SearchResponse {
  empresas: Array<{
    id: string;
    razaoSocial: string;
    cnpj: string;
    nomeFantasia: string | null;
  }>;
  nfse: Array<{
    id: string;
    serie: string;
    numero: string;
    descricaoServico: string;
    status: string;
    tomadorNome: string;
  }>;
  tomadores: Array<{
    id: string;
    nome: string;
    documento: string;
    clienteMeiId: string;
  }>;
  usuarios: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  api: Array<{
    path: string;
    description: string;
  }>;
}

const GROUPS = [
  {
    key: "empresas" as const,
    label: "Empresas",
    icon: Building2,
    toItems: (data: SearchResponse) =>
      data.empresas.map((e) => ({
        id: e.id,
        title: e.razaoSocial,
        subtitle: formatCnpj(e.cnpj),
        href: `/clientes/${e.id}`,
      })),
  },
  {
    key: "nfse" as const,
    label: "NFS-e",
    icon: FileText,
    toItems: (data: SearchResponse) =>
      data.nfse.map((n) => ({
        id: n.id,
        title: `${n.serie}-${n.numero}`,
        subtitle: `${n.tomadorNome} — ${truncate(n.descricaoServico, 50)}`,
        href: `/nfse/${n.id}`,
      })),
  },
  {
    key: "tomadores" as const,
    label: "Tomadores",
    icon: User,
    toItems: (data: SearchResponse) =>
      data.tomadores.map((t) => ({
        id: t.id,
        title: t.nome,
        subtitle: formatDocumento(t.documento),
        href: `/clientes/${t.clienteMeiId}?tab=tomadores`,
      })),
  },
  {
    key: "usuarios" as const,
    label: "Usuários",
    icon: Users,
    toItems: (data: SearchResponse) =>
      data.usuarios.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: u.email,
        href: "/users",
      })),
  },
  {
    key: "api" as const,
    label: "Endpoints API",
    icon: Code2,
    toItems: (data: SearchResponse) =>
      data.api.map((a) => ({
        id: a.path,
        title: a.path,
        subtitle: a.description,
        href: "/api-docs",
      })),
  },
];

function formatCnpj(cnpj: string) {
  if (cnpj.length !== 14) return cnpj;
  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function formatDocumento(doc: string) {
  if (doc.length === 11)
    return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (doc.length === 14) return formatCnpj(doc);
  return doc;
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen, closeSearch } = useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup do debounce e abort no unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Atalho global ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Busca com debounce + abort
  const search = useCallback((term: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term.trim())}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setResults(null);
          setLoading(false);
          return;
        }
        const data: SearchResponse = await res.json();
        setResults(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    search(value);
  }

  function handleSelect(href: string) {
    closeSearch();
    setQuery("");
    setResults(null);
    const currentPath = window.location.pathname;
    const targetPath = href.split("?")[0];
    if (currentPath === targetPath && href.includes("?")) {
      window.location.href = href;
    } else {
      router.push(href);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults(null);
      setLoading(false);
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }

  const totalResults = results
    ? GROUPS.reduce((sum, g) => sum + g.toItems(results).length, 0)
    : 0;

  const hasResults = totalResults > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed top-[10%] left-1/2 -translate-x-1/2 translate-y-0 max-w-[calc(100%-2rem)] sm:max-w-2xl w-[calc(100%-2rem)] p-0 gap-0 sm:top-[12%]"
      >
        <Command
          className="rounded-2xl overflow-hidden"
          shouldFilter={false}
          loop
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            {loading ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <Command.Input
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Buscar empresas, notas, tomadores, usuários..."
              className="flex-1 bg-transparent py-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query.length > 0 && (
              <kbd className="text-[10px] text-muted-foreground bg-muted/50 border border-border rounded px-1.5 py-0.5 font-mono">
                ESC
              </kbd>
            )}
          </div>

          {/* Resultados */}
          <Command.List className="max-h-[480px] overflow-y-auto overscroll-contain">
            {query.trim().length < 2 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Digite para buscar...
              </div>
            )}

            {query.trim().length >= 2 && !loading && results && !hasResults && (
              <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para &ldquo;{query}&rdquo;
              </Command.Empty>
            )}

            {results && hasResults && (
              <>
                {GROUPS.map((group) => {
                  const items = group.toItems(results);
                  if (items.length === 0) return null;
                  const Icon = group.icon;

                  return (
                    <Command.Group
                      key={group.key}
                      heading={
                        <span className="text-xs font-medium text-muted-foreground px-4 py-2 block">
                          {group.label} ({items.length})
                        </span>
                      }
                    >
                      {items.map((item) => (
                        <Command.Item
                          key={`${group.key}-${item.id}`}
                          value={`${group.key}-${item.id}`}
                          onSelect={() => handleSelect(item.href)}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm transition-none data-[selected=true]:bg-accent/50 hover:bg-accent/50"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </>
            )}
          </Command.List>

          {/* Footer */}
          {results && hasResults && (
            <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {totalResults} resultado{totalResults !== 1 ? "s" : ""}
              </span>
              <span>
                <kbd className="bg-muted/50 border border-border rounded px-1 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>{" "}
                navegar{" "}
                <kbd className="bg-muted/50 border border-border rounded px-1 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>{" "}
                abrir
              </span>
            </div>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
}
