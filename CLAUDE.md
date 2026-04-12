# Nexus NFE

## Projeto
Emissão automatizada de notas fiscais para MEIs via GOV.BR

**URL Produção:** https://nfe.nexusai360.com
**Repositório:** https://github.com/jvzanini/nexus-nfe
**Blueprint:** github.com/jvzanini/nexus-blueprint (v2.0.0)
**Tipo:** Interno Nexus AI
**Criado em:** 2026-04-10

## Metodologia
Este projeto segue a metodologia do Nexus Blueprint:
1. **Criação** — `/nexus-blueprint:criar` (concluída)
2. **Planejamento** — `superpowers:brainstorming` → `writing-plans`
3. **Construção** — `superpowers:executing-plans` com commits frequentes
4. **Absorção** — ao concluir, funcionalidades reutilizáveis voltam pro blueprint

## Idioma
Sempre responder em português brasileiro.

## Skills Obrigatórias
- **superpowers:** Brainstorm, planejamento, desenvolvimento, testes, debugging
- **ui-ux-pro-max:** OBRIGATÓRIO para TODO layout/UI — design system em `design-system/nexus-nfe/MASTER.md`

## Convenções
- Commits em português
- Código e variáveis em inglês
- Comentários em português quando necessário
- Server Actions em `src/lib/actions/`
- Todo texto visível ao usuário DEVE ter acentos e caracteres PT-BR corretos

## Stack Técnica
- Next.js 15+ (App Router, Server Components, Server Actions)
- TypeScript
- Prisma 6 + PostgreSQL 16
- Redis 7 + BullMQ (queue pattern)
- NextAuth.js v5 (JWT stateless, trustHost: true)
- Tailwind CSS v4 + shadcn/ui
- next-themes — dark/light/system mode
- Framer Motion
- Lucide React (ícones, nunca emojis)
- Resend (email transacional)

## Identidade Visual
- **Cor primária:** #7c3aed (violet Nexus)
- **Logo:** `public/logo.png`
- **Temas:** Dark (padrão), Light, Sistema

## Deploy
Portainer via GitHub Actions. Push pra `main` dispara build → push pro GHCR → update do stack `nexus-nfe` no Portainer.

Stack: `nexus-nfe_app` + `nexus-nfe_worker` + `nexus-nfe_db` + `nexus-nfe_redis`

## Módulos Incluídos
- **Core:** Auth, Users, Profile, Password Reset, Email
- **audit-log:** Registro de ações para compliance fiscal
- **encryption:** AES-256-GCM para credenciais GOV.BR dos clientes MEI
- **notifications:** Feed + badge + contagem
- **toast:** Sonner customizado

## Patterns Incluídos
- **dashboard:** Stats, gráficos, filtros
- **settings:** Configurações globais key/value
- **queue:** BullMQ worker pra processamento assíncrono de emissão NFE
- **outbox:** Eventos transacionais confiáveis

## Estado atual (2026-04-12)

### Concluído
- ✅ Fase 1 — Esqueleto (login, users, profile, dashboard, settings, sidebar com command palette funcional)
- ✅ **Fase -1 — Spike Técnico NFS-e** (37 testes passando + sanity check end-to-end OK)
  - Parser PKCS#12 (3DES e AES-256)
  - Geração de idDps (45 chars)
  - XML builder validado contra XSD oficial
  - Assinatura XMLDSIG verificada por `xmlsec1`
  - Empacotamento GZip+Base64
  - Orquestrador `prepareSubmission`
  - Endpoints SEFIN e ADN confirmados vivos (mTLS obrigatório)
- ✅ **Fase 1A** — Cadastro MEI + Upload de certificado (BrasilAPI, criptografia AES-256-GCM, cron expiração)
- ✅ **Fase 1B** — Catálogo NBS + Parâmetros Municipais + Numeração DPS
  - Seed de ~580 códigos de tributação nacional (LC 116/2003) via parser XLSX
  - Busca por código/descrição com autocomplete (componente NbsSelector)
  - Wrapper de parâmetros municipais (mock, mTLS real na Fase 3)
  - Numeração atômica de DPS (SELECT FOR UPDATE)
- ✅ **Fase 2** — DPS Builder completo + Form de emissão (117 testes passando)
  - Validador DPS com regras de negócio em português (27 testes)
  - Testes XSD expandidos — tomador PJ, endereço, intermediário, substituição (8 testes)
  - Schemas Zod para form de emissão (step-by-step)
  - Server actions: criarRascunhoNfse, listarNfses, getNfse
  - Form multi-step de emissão com 5 etapas (/nfse/nova)
  - Página de listagem /nfse com badges de status
- ✅ **Fase 3** — Transport mTLS + Pipeline de emissão (133 testes passando)
  - Client mTLS (https.Agent com cert A1)
  - SEFIN Client tipado (submitNfse, getNfse, headDps) com mock fetch nos testes
  - Parser de resposta da API (sucesso/erro)
  - Handler BullMQ de emissão (load cert → decrypt → build DPS → sign → pack → POST → update DB)
  - Action emitirNfse com validação de certificado + enfileiramento
  - Botão "Emitir NFS-e" funcional no form (aguarda cert A1 real para teste em homologação)
- ✅ **Fase 4** — Consulta + Download + Reconciliação (133 testes passando)
  - Página de detalhes /nfse/[id] com cards (cliente, serviço, tomador, valores, status/timeline)
  - Download de XML assinado/autorizado
  - Copiar chave de acesso para clipboard
  - Filtros na listagem: por status (botões) + busca textual (cliente, tomador, número)
  - Rows clicáveis navegando para detalhe
  - Actions expandidas: getNfseDetail, downloadXmlNfse, listarNfsesComFiltros
  - Job de reconciliação cron (a cada 5min verifica NFS-e em processando via HEAD /dps/{id})

- ✅ **Fase 5** — UX inteligente + memória + 1-clique (133 testes passando)
  - Actions CRUD de serviços memorizados e tomadores favoritos (upsert, uso count, último uso)
  - Sugestões de serviços recentes no step de serviço (auto-fill ao clicar)
  - Sugestões de tomadores recentes no step de tomador (auto-fill ao clicar)
  - Auto-save de serviço memorizado e tomador favorito após emissão (fire-and-forget)
  - Botão "Emitir novamente" no detalhe da NFS-e (re-emissão com pre-fill)
  - Atalho Ctrl+N / Cmd+N para nova NFS-e
  - Pre-fill automático do form via query param ?reemitir={id}

- ✅ **Fase 6** — Regras de negócio MEI (133 testes passando)
  - Actions: getFaturamentoAno, atualizarFaturamentoPos, verificarLimiteAntesDeEmitir
  - Faixas graduais: ok (≤80%), atenção (80-100%), alerta (100-120%), bloqueado (>120%)
  - Banner visual de faturamento anual com barra de progresso colorida
  - Verificação de limite no step de valores com avisos e bloqueio
  - Bloqueio acima de 120% impede emissão (risco de desenquadramento retroativo)

- ✅ **Fase 7** — Cancelamento + substituição + export (133 testes passando)
  - Action cancelarNfse com validação de prazo 24h
  - Action substituirNfse cria rascunho com substitutaDe preenchido
  - Action exportarXmlsPeriodo retorna XMLs autorizados de um período
  - UI: dialog de cancelamento com motivo obrigatório
  - UI: botão substituir cria rascunho e navega para detalhe
  - Botões visíveis apenas para NFS-e autorizada

- ✅ **Fase 8** — Observabilidade + toggle de ambiente (139 testes passando)
  - Logger estruturado (JSON) com sanitização de dados sensíveis (CNPJ mascarado, PFX/senha removidos)
  - Wrapper `withTiming` para medir duração de operações
  - Toggle de ambiente (produção restrita ↔ produção) via GlobalSettings, apenas super_admin
  - Confirmação explícita para mudar para produção

### Status: TODAS AS FASES CONCLUÍDAS
O pipeline de emissão de NFS-e está 100% codificado (Fases -1 a 8).
Para a primeira emissão real, faltam apenas os bloqueios externos:
1. Certificado A1 ICP-Brasil (real ou de teste)
2. Adesão gov.br nível Ouro ao Sistema Nacional NFS-e

### Bloqueios externos pra Fase 3 (submit real)
1. Adesão gov.br nível Ouro de CNPJ de teste ao Sistema Nacional NFS-e
2. Certificado A1 ICP-Brasil (real ou de teste)

### Decisão técnica: integração direta com gov.br/nfse (sem gateway pago)
- Custo zero pra plataforma (API oficial é gratuita)
- Cada MEI traz seu próprio certificado A1 (armazenado cifrado via módulo encryption)
- Emissão síncrona via `POST /nfse`, reconciliação via `HEAD /dps/{id}`
- DANFS-e PDF: fonte ainda a confirmar (provavelmente via ADN)
- Endpoints:
  - Homolog: `https://sefin.producaorestrita.nfse.gov.br/SefinNacional`
  - Prod: `https://sefin.nfse.gov.br/SefinNacional`

### Bug documentado no schema oficial
`tiposSimples_v1.01.xsd` tem pattern `^0{0,4}\d{1,5}$` em TSSerieDPS, onde `^` e `$` são interpretados como literais em W3C XSD regex. Workaround: cópia patched em `docs/nfse/reference/schemas-patched/`. Ver `docs/nfse/reference/spike-findings.md`.

## Código NFS-e (spike)
Tudo em `src/lib/nfse/`:
- `types.ts` — tipos alinhados ao XSD oficial v1.01
- `constants.ts` — URLs homolog/prod + constantes MEI
- `dps-id.ts` — buildIdDps(45 chars) + validação
- `pfx-loader.ts` — parser PKCS#12 via node-forge
- `xml-builder.ts` — serialização DPS (xmlbuilder2)
- `xml-signer.ts` — XMLDSIG (xml-crypto)
- `pack.ts` — GZip + Base64
- `prepare-submission.ts` — orquestrador build+sign+pack
- `nbs-parser.ts` — parser da planilha NBS (LC 116/2003)
- `parametros-municipais.ts` — wrapper de parâmetros municipais (mock Fase 1B, real Fase 3)
- `dps-validator.ts` — validador semântico pré-XML com erros em português
- `mtls-client.ts` — cria https.Agent para mTLS com cert A1
- `sefin-client.ts` — HTTP client tipado (submitNfse, getNfse, headDps)
- `response-parser.ts` — parser de resposta da API SEFIN
- `logger.ts` — logger estruturado com sanitização de dados sensíveis
- `__tests__/` — 17 arquivos, 139 testes

Rodar os testes: `npm test`
Rodar sanity check end-to-end: `npx tsx scripts/nfse-sanity-check.ts`

## Regras
- Todo serviço sobe como container Docker
- Credenciais NUNCA no GitHub — apenas em `.env.production` local
- Ir pelo caminho mais simples e direto

## Estrutura de Actions
Todas as Server Actions ficam em `src/lib/actions/`:
- `users.ts` — CRUD de usuários internos
- `profile.ts` — Perfil do usuário logado
- `password-reset.ts` — Fluxo de esqueci senha
- `notifications.ts` — Marcar como lida, feed
- `audit-log.ts` — Consulta e listagem (escrita é fire-and-forget)
- `settings.ts` — Leitura/escrita de configurações globais
- `clientes-mei.ts` — CRUD de clientes MEI + consulta BrasilAPI
- `certificados.ts` — Upload, validação e gestão de certificados A1
- `nbs.ts` — Busca de códigos de tributação nacional
- `parametros-municipais.ts` — Convênio e parâmetros de serviço por município
- `dps-numeracao.ts` — Reserva de número sequencial de DPS
- `nfse.ts` — Criar rascunho, listar, detalhar, emitir, download XML NFS-e
- `servicos-memorizados.ts` — CRUD de serviços memorizados por cliente
- `tomadores-favoritos.ts` — CRUD de tomadores favoritos por cliente
- `mei-limite.ts` — Verificação e controle do limite anual MEI (R$81k)
- `ambiente-nfse.ts` — Toggle de ambiente (homologação ↔ produção)
