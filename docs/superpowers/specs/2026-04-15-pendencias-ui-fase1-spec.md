# Spec Final — Fase 1: Pendências UI

**Data:** 2026-04-15
**Versões:** v1 (inicial) → review 1 (lacunas em validation/API/command-palette) → review 2 (robustez de logo + alinhamento 1:1 com Roteador) → **final (esta)**
**Escopo:** Fechar pendências remanescentes de `CLAUDE.md`:
1. Ícone da empresa (card + header detalhe) — espelhar 1:1 Roteador Webhook com suporte a `logoUrl`.
2. Tab Tomadores — filtro de busca com 3 recentes (padrão `tab-notas.tsx`).

## Decisões (registradas na review)

- **logoUrl opcional como string URL** — não implementar upload ainda (escopo futuro). Validação com `z.string().url()` permitindo vazio.
- **onError no `<img>`** — se URL quebrada, cair para fallback Building2 via state local `imgError`.
- **Scope do ícone**: atualizar somente `card listagem` (`clientes-content.tsx`) e `header detalhe` (`empresa-header.tsx`). NÃO alterar:
  - `step-cliente.tsx:121` (card de seleção de empresa no form — padrão violet diferente).
  - `nfse-content.tsx:506` (botão de agrupamento).
  - `command-palette.tsx` (ícone do grupo na busca global — mantém Building2 genérico).
  - `dashboard-content.tsx:198` (card stats "Empresas Ativas").
- **Busca global**: `SearchResponse.empresas` não carrega logo (otimização). Deferido.

## 1. Ícone da empresa

### Schema (`prisma/schema.prisma`)
```prisma
model ClienteMei {
  // ...campos existentes...
  logoUrl String? @map("logo_url")
  // ...
}
```
Migration: `add_logo_url_to_clientes_mei` (nullable, zero downtime).

### Validação (`src/lib/validation/cliente-mei.ts`)
```ts
logoUrl: z.string().trim().url("URL inválida").optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
```
Adicionar ao `createClienteMeiSchema` e automaticamente disponível em `updateClienteMeiSchema` (partial).

### Actions (`src/lib/actions/clientes-mei.ts`)
- Adicionar `logoUrl: string | null` em `ClienteMeiListItem` e `ClienteMeiDetail`.
- `listClientesMei` / `getClienteMei`: incluir `logoUrl` no select e no mapper.

### API REST (`src/app/api/v1/empresas/route.ts` e `[id]/route.ts`)
- GET: adicionar `logoUrl` ao `select` e ao objeto de resposta.
- POST/PUT: aceitar `logoUrl` no body (o Zod já valida via schema compartilhado).
- `/api-docs`: atualizar exemplo das rotas.

### Componentes

**Card listagem (`clientes-content.tsx`)** — substituir o bloco atual do ícone por:
```tsx
{empresa.logoUrl ? (
  <img
    src={empresa.logoUrl}
    alt={`Logo ${empresa.razaoSocial}`}
    onError={() => markLogoBroken(empresa.id)}
    className="w-11 h-11 rounded-xl object-cover ring-1 ring-border/50 shrink-0"
  />
) : (
  <div className="w-11 h-11 rounded-xl bg-muted border border-border/50 flex items-center justify-center shrink-0">
    <Building2 className="w-5 h-5 text-muted-foreground" />
  </div>
)}
```
Controle `brokenLogoIds: Set<string>` via `useState` pra degradar graciosamente.

**Header detalhe (`empresa-header.tsx`)** — trocar para `w-14 h-14` fixo (remover breakpoint `sm:`):
```tsx
{empresa.logoUrl && !imgBroken ? (
  <img
    src={empresa.logoUrl}
    alt={`Logo ${empresa.razaoSocial}`}
    onError={() => setImgBroken(true)}
    className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
  />
) : (
  <div className="w-14 h-14 rounded-xl bg-muted border border-border/50 flex items-center justify-center shrink-0">
    <Building2 className="w-7 h-7 text-muted-foreground" />
  </div>
)}
```

**Dialog edição (`edit-empresa-dialog.tsx`)** — adicionar campo `Logo URL (opcional)` tipo `input type="url"` antes do separador "Desativar/Excluir".

**Dialog Nova Empresa** — localizar form de criação (provavelmente inline em `clientes-content.tsx`) e adicionar mesmo campo em seção "Dados opcionais" ou após "Nome Fantasia".

## 2. Tab Tomadores — filtro com 3 recentes

### Estado atual
- `tab-tomadores.tsx` tem `search` em input; sem CustomSelect de recentes.

### Padrão referência (interno)
- `tab-notas.tsx:161-168` já calcula recentes e usa `CustomSelect` com `description: "Recente"`.

### Mudanças em `tab-tomadores.tsx`
```ts
const tomadoresRecentesIds = useMemo(() => {
  return [...tomadores]
    .filter((t) => t.ultimoUso)
    .sort((a, b) => new Date(b.ultimoUso!).getTime() - new Date(a.ultimoUso!).getTime())
    .slice(0, 3)
    .map((t) => t.id);
}, [tomadores]);

const [filterTomadorId, setFilterTomadorId] = useState("");

const options = [
  { value: "", label: "Todos os tomadores" },
  ...tomadores.map((t) => ({
    value: t.id,
    label: t.nome,
    description: tomadoresRecentesIds.includes(t.id) ? "Recente" : undefined,
  })),
];

// Renderizar <CustomSelect> acima da tabela, flex-row com input search.
// Filtro efetivo: if (filterTomadorId && t.id !== filterTomadorId) skip.
```

Garantir que `listarTomadoresFavoritos` retorne `ultimoUso` (já retorna — campo existe no schema `TomadorFavorito.ultimoUso`).

## Impacto / riscos

- Migration nullable — zero downtime em produção.
- `onError` no `<img>` garante robustez mesmo com URL quebrada.
- Nenhum teste existente deve quebrar (139 testes NFS-e não tocam em UI de empresas).

## Critérios de aceitação

1. `npm run build` verde.
2. `npm test` 139/139.
3. `npx prisma generate` + migration aplicada localmente.
4. Card e header de empresa com logo (quando `logoUrl` set) e fallback Building2 idênticos ao Roteador.
5. Tab Tomadores com CustomSelect + badge "Recente" nos 3 últimos usados.
6. CLAUDE.md marcando as duas pendências como concluídas.
