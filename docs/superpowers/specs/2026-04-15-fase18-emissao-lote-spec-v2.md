# Fase 18 — Emissão em lote de NFS-e via CSV (spec v2)

**Data:** 2026-04-15
**Objetivo:** Emissão em massa de NFS-e a partir de CSV, com preview, validação fiscal completa, processamento assíncrono via queue, e acompanhamento em tempo real.

## Pontos corrigidos na v2 (vs. v1)
1. Permissões explícitas via `EmpresaMembership` + super_admin.
2. Parser de valor BR (`1.234,56`) e data BR (`DD/MM/YYYY`) com fallback ISO.
3. Endereço do tomador herdado do favorito (se existir) — se não houver, salvo sem endereço (DPS aceita).
4. Reprocessar rejeitadas: cria NOVA Nfse (nova numeração DPS) — não reaproveita para evitar conflito de status na SEFIN.
5. Reserva de numeração em bloco via transação única (com backup se falhar no meio).
6. Limite 500 itens mantido (configurável via `GlobalSettings` key `lote.max_itens`).
7. Polling simples no detalhe (React `useEffect` com setInterval 5s enquanto lote não está concluído).
8. Rate-limit "5 lotes simultâneos por empresa": checar `count(NfseLote where clienteMeiId and status in (pendente, processando)) < 5` antes de criar.
9. Template CSV tem header claro + uma linha de exemplo comentada.
10. Export final CSV: colunas `linha, status, numero_nfse, chave_acesso, erro, tomador_documento, tomador_nome, valor`.
11. Data de competência: validar mês atual ou até 1 mês retroativo (regra Nacional NFS-e).
12. Status da NFS-e → NfseLoteItem: espelhar via função `atualizarStatusItemLote` chamada no worker.
13. Idempotência: usuário pode recriar lote com mesmo CSV — não bloquear (é só aviso visual).

## Escopo IN

### Rotas
- `/nfse/lote` — listagem (cards estilo Roteador).
- `/nfse/lote/novo` — wizard 3 steps.
- `/nfse/lote/[id]` — detalhe com polling.
- Botão "Emitir em lote" no header de `/nfse`.

### Models Prisma
(iguais à v1 — manter nomes)

Adicionalmente, adicionar em `ClienteMei`:
```
lotes NfseLote[]
```
E em `Nfse`:
```
loteItem NfseLoteItem?
```
(relação inversa do `@unique nfseId` no NfseLoteItem).

### Actions (`src/lib/actions/nfse-lote.ts`)
- `previewLoteCsv(clienteMeiId, servicoPadrao, csvText)` → `{ validos[], invalidos[], duplicados, totalValor, totalIss, bloqueios[] }`.
- `criarLote(clienteMeiId, servicoPadrao, csvText, nomeArquivo)` → `{ loteId }`. Transação: cria `NfseLote`, reserva N números DPS, cria N `Nfse` rascunho, cria N `NfseLoteItem`, enqueue. Se falhar no meio, rollback total.
- `listarLotes(clienteMeiId?, filtros?)` → cards.
- `getLoteDetail(id)` → header + itens paginados (100 por página).
- `cancelarLote(id)` → só se `pendente`. Remove jobs da queue (por `job.remove()`) e marca itens cancelados.
- `reprocessarRejeitadas(id)` → re-enfileira só os rejeitados; cria nova Nfse e novo item-link (ou atualiza item com novo nfseId? Definido: atualiza item apontando para novo nfseId, antigo fica órfão mas marcado como `rejeitado` histórico).

**Correção:** para manter histórico de tentativas, criar `NfseLoteItemTentativa` seria ideal, mas isso infla escopo. Decisão: manter 1 nfseId por item. Ao reprocessar, criar nova Nfse e SOBRESCREVER `item.nfseId` (a Nfse antiga rejeitada fica na tabela `nfses` com `loteItem=null` após update — ela ainda aparece na listagem geral de NFS-e com status rejeitado). Auditoria registra a tentativa anterior.

### Validação CSV
Colunas obrigatórias (header): `documento`, `nome`, `valor_servico`.
Opcionais: `email`, `descricao_servico`, `data_competencia`.

Parser:
- Separador autodetect (`;` se primeira linha contém mais `;` que `,`).
- BOM UTF-8 tolerado.
- `valor_servico`: aceita `100`, `100,50`, `100.50`, `1.234,56`. Normalizar para número.
- `data_competencia`: `DD/MM/YYYY` ou `YYYY-MM-DD`. Default hoje.
- `descricao_servico` vazio → usa `servicoPadrao.descricaoServico`.

Validações por linha:
- Documento obrigatório, 11 (CPF válido) ou 14 (CNPJ válido) dígitos.
- Nome obrigatório, >= 2 caracteres.
- Email opcional, formato válido.
- Valor > 0, <= 999.999.999,99.
- Data competência no mês atual ou até 1 mês retroativo.
- Descrição >= 5 caracteres.

Bloqueios globais (retornados na lista `bloqueios`):
- Empresa inativa.
- Sem certificado A1 ativo / expirado.
- Limite MEI (se aplicável): `faturamentoAno + somaLote > 81000` → bloquear.
- >5 lotes simultâneos da empresa.
- > `lote.max_itens` (default 500).

### Worker (src/lib/workers/nfe-worker.ts — existente)
Após processamento de cada job, adicionar chamada para `atualizarStatusItemLote(nfseId)`:
- Busca `NfseLoteItem where nfseId`.
- Se existe, espelha status (`autorizado`/`rejeitado`/`processando`).
- Se após update todos itens do lote estão em estado terminal, marca lote como `concluido`, grava `finalizadoEm`, dispara notificação in-app + email opcional, audit `lote.concluido`.

### UI (ui-ux-pro-max obrigatório)
- `/nfse/lote`: grid de cards (razão social empresa, nome arquivo, badge status colorido, 3 stats pills, data). Botão "+ Novo lote" no header.
- Wizard `/nfse/lote/novo`:
  - Step 1: CustomSelect empresa + toggle "Usar serviço memorizado" (CustomSelect) OR inputs manuais (código tributação via NBS selector, descrição, local prestação via IBGE, alíquota ISS, data competência padrão).
  - Step 2: drop area + textarea "colar CSV" + botão "Baixar template". Footer mostra quantidade de linhas detectadas.
  - Step 3: tabela preview com abas "Válidos (X)", "Inválidos (Y)", "Duplicados (Z)". Resumo financeiro (total, ISS). Alertas de bloqueio. Botão "Criar lote" habilitado só se válidos > 0 e sem bloqueios.
- `/nfse/lote/[id]`:
  - Header: nome arquivo, status, progresso (barra + %).
  - 4 stats: total, autorizadas, rejeitadas, pendentes.
  - Tabela itens (filtro status, busca por documento/nome). Para item autorizado: link para `/nfse/[id]`. Para rejeitado: tooltip com erro.
  - Ações: Cancelar (se pendente), Reprocessar rejeitadas, Exportar CSV resultado.
- Template `/public/templates/nfse-lote-exemplo.csv`:
  ```
  documento;nome;email;valor_servico;descricao_servico;data_competencia
  12345678901;João da Silva;joao@exemplo.com;150,00;;15/04/2026
  ```

### Permissões
- `requireEmpresaAccess(clienteMeiId)`: super_admin OU membership (role != viewer).
- Viewer não pode criar lote; pode visualizar.

### Testes
Unit:
- `parseCsvValor("1.234,56")` === 1234.56.
- `parseCsvData("15/04/2026")` === Date 2026-04-15.
- Preview: 10 linhas OK, 2 doc inválido, 1 duplicada → 10 válidos, 2 inválidos, 1 duplicada.
- Bloqueio MEI: faturamento 70k + lote 20k → bloqueado.
- Bloqueio certificado expirado.
- `criarLote`: reserva 10 numerações contíguas, cria 10 Nfse + 10 itens, enfileira 10 jobs.
- `atualizarStatusItemLote`: espelha status; marca lote concluído quando último item terminal.
- `cancelarLote`: impede cancelar se status=processando.
- `reprocessarRejeitadas`: só mexe em status=rejeitado.

Integração:
- Wizard E2E (simular com fetch): cria lote, mock queue, confirma persistência.

### Observabilidade
- Audit: `lote.criado`, `lote.cancelado`, `lote.reprocessado`, `lote.concluido`, `lote.item_rejeitado`.
- Logger estruturado em cada passo do worker.

### Migrations
`npx prisma migrate dev --name fase18_nfse_lote` → 3 tabelas novas (enums + 2 models + 1 relação inversa em ClienteMei e Nfse).

## Escopo OUT
- Agendamento/recorrência.
- API REST v1 endpoint de lote.
- XLSX.
- Envio automático de email ao tomador (já existe no fluxo unitário — herda naturalmente quando NFS-e autoriza).

## Critérios de sucesso
- Preview 200 linhas < 2s.
- Criar lote 200 itens < 10s (transação).
- UI polling atualiza status sem reload manual.
- Testes ≥ 90% nas funções de `nfse-lote.ts`.
- Audit consistente.
- Deploy produção sem regressão nos 144 testes existentes.

## Riscos e mitigações
- **Transação grande (500 items):** Prisma transaction timeout default 5s. Aumentar para 30s via `prisma.$transaction([...], { timeout: 30_000 })`.
- **Queue saturation:** enqueue em batch com `queue.addBulk([...])`.
- **Race na numeração DPS:** `reservarProximoNumeroDps` usa update atômico — OK mesmo em loop; preferir 1 chamada por item dentro da transação.
- **Limite SEFIN:** processamento natural serial por worker (concurrency=1) evita flood.
- **Rollback parcial:** se criar 250/500 e falhar, `$transaction` reverte tudo.
