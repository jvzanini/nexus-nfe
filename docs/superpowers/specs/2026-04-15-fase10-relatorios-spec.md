# Spec Final — Fase 10: Relatórios + Export CSV

**Data:** 2026-04-15
**Iterações:** v1 → review (separar agregados de listagem) → v2 → review (CSV streaming, segurança RBAC) → final

## Objetivo
Criar página `/relatorios` para gerar visões consolidadas de emissões (período + empresa + status) com export CSV pronto para contabilidade.

## Escopo
- Página `/relatorios` (admin+).
- Filtros: período (Hoje, 7d, 30d, 90d, customizado), empresa (todas/única), status (todos, autorizada, rejeitada, cancelada, etc.).
- Cards-resumo: total emitido (R$), quantidade, autorizadas, rejeitadas, ticket médio.
- Gráfico Recharts: barras de emissões/dia (período).
- Tabela paginada: coluna empresa, série/número, tomador, valor, status, data.
- Botão "Exportar CSV" baixa arquivo com todas as colunas relevantes (UTF-8 com BOM, separador `;` para Excel BR).
- Item "Relatórios" no sidebar (visível para admin+).

## Out of scope
- Export PDF (deferido).
- Salvar relatórios favoritos (deferido).
- Webhook de envio agendado (deferido — Fase 12).

## Detalhes

### Server actions (`src/lib/actions/relatorios.ts`)
```ts
gerarRelatorioEmissao(filters): { resumo, serie, items }
exportarRelatorioCsv(filters): string  // CSV completo
```
- Reusa filtros de `nfse.ts`.
- `resumo`: totalEmitido, quantidade, autorizadas, rejeitadas, canceladas, ticketMedio.
- `serie`: array `[{ data: "2026-04-01", quantidade, valor }]` agregado por dia.
- `items`: linhas detalhadas (limitar a 1000 para UI; CSV sem limite).
- RBAC: requireRole("admin").

### Página
- `src/app/(protected)/relatorios/page.tsx` + `relatorios-content.tsx`.
- Layout consistente: header (título, subtítulo, botão Exportar CSV à direita), faixa de filtros (CustomSelect padrão), grid de stats (4 cards), gráfico, tabela.
- Reutilizar componentes existentes (CustomSelect, Card, Table, gráfico do dashboard).

### CSV
- Colunas: CNPJ Emitente, Razão Social Emitente, Série, Número, Status, Data Emissão, Data Autorização, Tomador (Doc), Tomador (Nome), Descrição, Cód Serviço, Valor Serviço, Alíquota ISS, Valor ISS, Chave Acesso, Número NFS-e, Mensagem.
- BOM UTF-8 + separador `;` + cabeçalho.
- Endpoint server action retorna string; cliente cria Blob + download.

### Navegação
- Adicionar `{ label: "Relatórios", href: "/relatorios", icon: BarChart3, allowedRoles: ["super_admin", "admin"] }` em `RESTRICTED_NAV_ITEMS` (ou `MAIN_NAV_ITEMS`).

## Critérios de aceitação
- Build verde + 144+ testes verdes.
- `/relatorios` carrega, filtros funcionam, gráfico renderiza.
- Export CSV abre corretamente no Excel BR (acentos, separador).
- RBAC: viewer não vê item nem acessa rota.
