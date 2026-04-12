"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchNbs, type NbsSearchResult } from "@/lib/actions/nbs";
import { Search, Loader2 } from "lucide-react";

interface NbsSelectorProps {
  value?: string;
  onSelect: (codigo: string, descricao: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function NbsSelector({
  value,
  onSelect,
  placeholder = "Buscar por código ou descrição do serviço...",
  disabled = false,
}: NbsSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NbsSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const res = await searchNbs(q);
      if (res.success && res.data) {
        setResults(res.data);
        setIsOpen(res.data.length > 0);
      }
      setIsLoading(false);
    }, 300);
  }, []);

  function handleSelect(item: NbsSearchResult) {
    onSelect(item.codigo, item.descricao);
    setSelectedLabel(`${item.codigo} — ${item.descricao}`);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  function formatAliquota(item: NbsSearchResult): string | null {
    if (!item.aliquotaMin && !item.aliquotaMax) return null;
    if (item.aliquotaMin === item.aliquotaMax) return `${item.aliquotaMin}%`;
    return `${item.aliquotaMin ?? "?"}% – ${item.aliquotaMax ?? "?"}%`;
  }

  return (
    <div ref={containerRef} className="relative">
      {value && selectedLabel && !query ? (
        <div
          className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
          onClick={() => {
            if (!disabled) {
              setSelectedLabel("");
              setQuery("");
            }
          }}
        >
          <Badge variant="secondary" className="font-mono text-xs">
            {value}
          </Badge>
          <span className="truncate text-muted-foreground">
            {selectedLabel.split(" — ")[1]}
          </span>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {results.map((item) => {
            const aliq = formatAliquota(item);
            return (
              <button
                key={item.codigo}
                type="button"
                className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => handleSelect(item)}
              >
                <Badge
                  variant="outline"
                  className="mt-0.5 shrink-0 font-mono text-xs"
                >
                  {item.codigo}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.descricao}</p>
                  {aliq && (
                    <p className="text-xs text-muted-foreground">ISS: {aliq}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
