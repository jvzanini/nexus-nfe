# Nexus NFE

## LEI ABSOLUTA — Metodologia de Desenvolvimento Autônomo

**Esta seção é LEI. Toda sessão neste projeto segue isto, a menos que o usuário diga o contrário explicitamente.**

### Modo autônomo
- O usuário autorizou desenvolvimento **ponta a ponta sem aprovações intermediárias**.
- Ao iniciar uma sessão neste projeto, identificar a próxima fase pendente e executar até o fim, passando para a próxima fase sozinho.
- Não pedir confirmação. Não pausar pedindo "posso continuar?". Apenas seguir.

### Fluxo obrigatório por fase (usando skill `superpowers`)
Para CADA fase de desenvolvimento, executar nesta ordem exata:

1. **Brainstorm** (`superpowers:brainstorming`) — entender o que precisa ser feito.
2. **Spec v1** (`superpowers:writing-plans` ou similar) — gerar a spec inicial.
3. **Review 1 da spec** — verificar: esqueci algo? estou repetitivo? estou furando identidade visual/componentes existentes? o que posso melhorar?
4. **Spec v2** — refazer com base no review 1.
5. **Review 2 da spec** — pente fino mais profundo, verificar implementação completa.
6. **Spec final (v3)** — versão consolidada.
7. **Plan v1** (`superpowers:writing-plans`) — muito detalhado, muitas tasks, bem segmentado, sem economia em detalhes.
8. **Review 1 do plan** — pente fino, tudo certinho.
9. **Plan v2** — refazer com base no review.
10. **Review 2 do plan** — pente fino ainda mais criterioso.
11. **Plan final (v3)**.
12. **Implementação** (`superpowers:executing-plans` / developer) — executar tasks em ordem.
13. **Testes** — rodar stack de testes, garantir verde.
14. **Ao finalizar a fase:** atualizar docs, CLAUDE.md, memória, commits, deploy. Só então partir pra próxima fase.

### UI/Layout
- Toda UI usa `ui-ux-pro-max` obrigatoriamente, **respeitando consistência** da plataforma (design system existente, sidebar, cores, componentes shadcn, CustomSelect, padrão Roteador Webhook).
- Nunca fugir do padrão visual já construído.

### Protocolo de repositório (GitHub rate limit / cobrança)
Se ao dar push/deploy o GitHub retornar erro de cobrança, rate limit ou limite de uso gratuito por ser repositório privado:

1. **Autorizado sem confirmação** a executar o protocolo abaixo.
2. **Double check de segurança em 3 etapas:**
   - Avaliação 1: varrer repo atrás de `.env`, chaves, credenciais, senhas, tokens, certificados, API keys.
   - Review 1 da avaliação.
   - Avaliação 2: pente fino mais profundo.
   - Review 2 da avaliação.
   - Avaliação 3 (conclusão final): decisão.
3. Tudo que estiver exposto: mover pra `.gitignore`, remover do histórico se necessário, rotacionar.
4. Após confirmação na 3ª avaliação de que não há exposição: **tornar repositório público** sem pedir autorização.
5. Só volta a privado quando o usuário pedir explicitamente.

### Resolução autônoma de problemas
- Qualquer erro, falha, dúvida: **resolver sozinho**, sem perguntar ao usuário.
- Se bloqueio persistir em uma etapa: **pular** pra próxima etapa/fase, anotar o bloqueio em `docs/superpowers/bloqueios.md` e na memória.
- **Proibido:** agendar `ScheduleWakeup`, dormir, standby, loops de polling. Sempre avançar com trabalho útil em paralelo enquanto algo roda (build, testes).
- Build/deploy demorado: seguir implementando a próxima task em paralelo, não ficar esperando.

### Dependências externas (API keys, integrações, decisões humanas)
- Funcionalidade depende de chave de API que não tenho, integração externa bloqueada, ou decisão do usuário: **implementar até onde der** (estrutura, mocks, interfaces), marcar o ponto como `[AGUARDANDO: <descrição>]` em `docs/superpowers/bloqueios.md`, e **seguir com outra fase**. Nunca empacar.
- O usuário confia na recomendação — quando houver escolha técnica, decidir e documentar o porquê.

### Silêncio e comunicação
- Trabalhar em silêncio, narração mínima (padrão global do usuário).
- Relatar apenas: bloqueios, informações críticas, resumo final de fase.

## Projeto
Emissão automatizada de notas fiscais para empresas via GOV.BR

**URL Produção:** https://nfe.nexusai360.com
**Repositório:** https://github.com/jvzanini/nexus-nfe
**Blueprint:** github.com/jvzanini/nexus-blueprint (v2.0.0)
**Tipo:** Interno Nexus AI
**Criado em:** 2026-04-10
**Login Produção:** nexusai360@gmail.com / ***REMOVED-ADMIN-PASSWORD***

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
- **Referência visual:** SEMPRE copiar 1:1 do Roteador Webhook (`/Users/joaovitorzanini/Developer/Claude Code/Roteador Webhook Meta/`)

## Convenções
- Commits em português
- Código e variáveis em inglês
- Comentários em português quando necessário
- Server Actions em `src/lib/actions/`
- Todo texto visível ao usuário DEVE ter acentos e caracteres PT-BR corretos
- NUNCA usar emojis — apenas ícones Lucide React

## Stack Técnica
- Next.js 15+ (App Router, Server Components, Server Actions)
- TypeScript
- Prisma 6 + PostgreSQL 16
- Redis 7 + BullMQ (queue pattern, lazy loading)
- NextAuth.js v5 (JWT stateless, trustHost: true)
- Tailwind CSS v4 + shadcn/ui
- next-themes — dark/light/system mode
- Framer Motion
- Recharts (gráficos do dashboard e visão geral)
- Lucide React (ícones, nunca emojis)
- Resend (email transacional)
- jsPDF (geração de DANFS-e PDF)

## Identidade Visual
- **Cor primária:** #7c3aed (violet Nexus)
- **Logo:** `public/logo.png`
- **Temas:** Dark (padrão), Light, Sistema

## Deploy
Portainer via GitHub Actions. Push pra `main` dispara build → push pro GHCR → update do stack `nexus-nfe` no Portainer.

Stack: `nexus-nfe_app` + `nexus-nfe_worker` + `nexus-nfe_db` + `nexus-nfe_redis`
Rede: `rede_nexusAI` (externa, compartilhada com Traefik)
Domínio: `nfe.nexusai360.com` (HTTPS via Traefik + Let's Encrypt)

### Workflows CI/CD
- `.github/workflows/build.yml` — Build, push GHCR, deploy via Portainer API
- `.github/workflows/create-stack.yml` — Cria stack no Portainer (manual)
- `.github/workflows/update-stack-env.yml` — Atualiza env vars da stack (manual)
- `.github/workflows/run-seed.yml` — Roda migrations + seed no container (manual)

### Env vars de produção (no Portainer)
- `DB_PASSWORD`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`
- `RESEND_API_KEY=***REMOVED-RESEND-KEY***`
- `ADMIN_EMAIL=nexusai360@gmail.com`, `ADMIN_PASSWORD=***REMOVED-ADMIN-PASSWORD***`

### Entrypoint do container
O `docker/entrypoint.sh` roda `prisma migrate deploy` + `node seed-prod.js` antes do app iniciar. O `docker/seed-prod.js` cria o super admin se não existir.

### Rotas temporárias
- `/api/setup` e `/api/debug-login` removidas em 2026-04-13 após estabilização da autenticação.

## Módulos Incluídos
- **Core:** Auth, Users, Profile, Password Reset, Email
- **audit-log:** Registro de ações para compliance fiscal
- **encryption:** AES-256-GCM para certificados dos clientes
- **notifications:** Feed + badge + contagem
- **toast:** Sonner customizado

## Patterns Incluídos
- **dashboard:** Stats reais, gráfico Recharts, filtros período, tabela de recentes
- **settings:** Configurações globais key/value
- **queue:** BullMQ worker pra processamento assíncrono (lazy loading)
- **outbox:** Eventos transacionais confiáveis
- **busca global:** Command palette ⌘K buscando em empresas, NFS-e, tomadores, usuários, API

## Estado atual (2026-04-13)

### Em produção — https://nfe.nexusai360.com

**Todas as 8 fases + Fase 9 (notificações por email) + API REST + Ajustes UI (144 testes passando)**

**Fases de implementação:**
- ✅ Fase 1 — Esqueleto (login, users, profile, dashboard, settings, sidebar)
- ✅ Fase -1 — Spike Técnico NFS-e (37 testes, XML + XMLDSIG + XSD)
- ✅ Fase 1A — Cadastro empresas + Upload certificado A1
- ✅ Fase 1B — Catálogo NBS (~580 códigos) + Parâmetros Municipais + Numeração DPS
- ✅ Fase 2 — DPS Builder completo + Form multi-step de emissão
- ✅ Fase 3 — Transport mTLS + Pipeline de emissão (build→sign→pack→POST)
- ✅ Fase 4 — Consulta + Download XML/PDF + Reconciliação cron
- ✅ Fase 5 — UX inteligente (memória, favoritos, re-emissão 1-clique, Ctrl+N)
- ✅ Fase 6 — Regras MEI (limite R$81k, faixas graduais, bloqueio >120%)
- ✅ Fase 7 — Cancelamento + Substituição + Export XMLs
- ✅ Fase 8 — Observabilidade + Toggle de ambiente
- ✅ Fase 9 — Notificações por email (cert expirando + NFS-e rejeitada/erro, opt-out em /profile) — 2026-04-15
- ✅ Fase 10 — Relatórios + Export CSV (`/relatorios` com filtros, stats, gráfico, tabela, CSV Excel BR) — 2026-04-15
- ✅ Fase 11 — Webhooks Outbound (eventos nfse.autorizada/rejeitada/cancelada via outbox, HMAC-SHA256, tab Webhooks por empresa, retry 30s) — 2026-04-15
- ✅ Fase 12 — Importação em massa de tomadores via CSV (upload/paste, preview com válidos/inválidos/duplicados, upsert) — 2026-04-15
- ✅ Fase 13 — Dashboard de Auditoria (`/auditoria` com filtros de período/recurso/ação/ator, tabela com detalhes em dialog, export CSV) — 2026-04-15
- ✅ Fase 14 — Export lote ZIP (XMLs autorizados + PDFs DANFS-e por período em `/relatorios`) — 2026-04-15
- ✅ Fase 15 — Gestão self-service de API Keys em `/settings` (criar/revogar, chave exibida uma única vez) — 2026-04-15
- ✅ Fase 16 — API REST de webhooks (GET/POST `/api/v1/empresas/[id]/webhooks`, PUT/DELETE `/[webhookId]`, rotação de secret) — 2026-04-15
- ✅ Fase 17 — Portal público de NFS-e (`/v/[chave]` sem login + `/api/public/nfse/[chave]/pdf`, botão "Link público" na tela de detalhe) — 2026-04-15
- ✅ Fase 18 — Emissão em lote de NFS-e via CSV (`/nfse/lote` wizard 3 steps + detalhe com polling + reprocessar rejeitadas + export resultado CSV; limite padrão 500 itens/lote, 5 lotes simultâneos por empresa) — 2026-04-15
- ✅ Fase 19 — Agendamento e recorrência de NFS-e (`/nfse/agendamentos` CRUD + frequências unica/mensal/bimestral/trimestral/semestral/anual, worker tick a cada 5 min, executar agora, pausar/retomar/encerrar, histórico de execuções) — 2026-04-15

**API REST v1 (~26 endpoints):**
- ✅ Auth por API Key (X-API-Key)
- ✅ NFS-e: GET/POST/DELETE, emitir, cancelar, substituir, XML, PDF
- ✅ Empresas: GET/POST/PUT/DELETE, tomadores CRUD, certificado, notas
- ✅ Usuários: GET/POST
- ✅ Relatórios: emissão por período
- ✅ Catálogo NBS + Configurações
- ✅ Documentação interativa em /api-docs (17+ endpoints com syntax highlighting)

**Ajustes UI (padrão Roteador Webhook):**
- ✅ Cards de empresa 1:1 Roteador (glow hover, ícone, stats, chevron)
- ✅ Detalhe com 5 tabs: Visão Geral, Certificado, Tomadores, Notas, Membros
- ✅ Dialog Editar empresa (form + desativar/excluir)
- ✅ Tab Membros com gestão de papéis (super_admin → viewer)
- ✅ Dashboard com dados reais, filtros período, gráfico Recharts
- ✅ CustomSelect padronizado em todos os filtros
- ✅ Gráfico de emissões mensais na visão geral da empresa
- ✅ Grupos empresariais de tomadores
- ✅ Busca global ⌘K (empresas, NFS-e, tomadores, usuários, API)
- ✅ Geração de PDF DANFS-e (jsPDF)
- ✅ Tutorial/ajuda passo-a-passo
- ✅ NBS Selector com navegação por teclado
- ✅ Faturamento dinâmico no form
- ✅ Ícones de ação alinhados (Eye, XML, PDF)
- ✅ Performance: lazy loading Redis/Queue

### Pendente — ajustes UI solicitados (spec em docs/superpowers/specs/2026-04-13-ajustes-ui-massivos.md)

**Ainda não feito:**
- ✅ Dashboard alinhado com referência (sininho + filtro por empresa)
- ✅ Tabs da empresa mais sutis (estilo ajustado)
- ✅ Ícone da empresa no card/detalhe: logo (`logoUrl`) com fallback Building2 1:1 Roteador (2026-04-15)
- ✅ Tab Notas dentro da empresa com filtros/agrupamento da listagem principal
- ✅ Tab Tomadores: filtro de busca com 3 recentes via CustomSelect (2026-04-15)
- ✅ Listagem NFS-e com status em CustomSelect colorido
- ✅ Agrupamento com botões destacados
- ✅ Coluna Ações alinhada em todos os cenários tratados
- ✅ Rotas temporárias removidas (/api/setup, /api/debug-login)

### Para emissão real em produção
1. Certificado A1 ICP-Brasil (real ou de teste)
2. Adesão gov.br nível Ouro ao Sistema Nacional NFS-e

## Código NFS-e
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
- `parametros-municipais.ts` — wrapper de parâmetros municipais
- `dps-validator.ts` — validador semântico pré-XML
- `mtls-client.ts` — https.Agent para mTLS
- `sefin-client.ts` — HTTP client tipado (node:https nativo)
- `response-parser.ts` — parser de resposta da API SEFIN
- `pdf-generator.ts` — geração de DANFS-e PDF (jsPDF)
- `logger.ts` — logger estruturado com sanitização
- `__tests__/` — 17 arquivos, 139 testes

Rodar os testes: `npm test`

## Estrutura de Actions
Todas as Server Actions ficam em `src/lib/actions/`:
- `users.ts` — CRUD de usuários internos
- `profile.ts` — Perfil do usuário logado
- `password-reset.ts` — Fluxo de esqueci senha
- `notifications.ts` — Marcar como lida, feed
- `audit-log.ts` — Consulta e listagem
- `settings.ts` — Leitura/escrita de configurações globais
- `clientes-mei.ts` — CRUD de empresas + consulta BrasilAPI
- `certificados.ts` — Upload, validação e gestão de certificados A1
- `nbs.ts` — Busca de códigos de tributação nacional
- `parametros-municipais.ts` — Convênio e parâmetros por município
- `dps-numeracao.ts` — Reserva de número sequencial de DPS
- `nfse.ts` — CRUD NFS-e, emitir, cancelar, substituir, download XML/PDF, gráfico
- `servicos-memorizados.ts` — CRUD de serviços memorizados
- `tomadores-favoritos.ts` — CRUD de tomadores favoritos
- `mei-limite.ts` — Verificação do limite anual MEI (R$81k)
- `ambiente-nfse.ts` — Toggle de ambiente
- `dashboard.ts` — Dados do dashboard (stats, gráfico, recentes)
- `empresa-memberships.ts` — Gestão de membros por empresa
- `grupos-empresariais.ts` — Grupos empresariais de tomadores
- `nfse-lote.ts` — Emissão em lote via CSV (preview, criar, listar, detalhe, cancelar, reprocessar, exportar)
- `nfse-agendamentos.ts` — Agendamento/recorrência (criar, listar, detalhe, pausar/retomar/encerrar, executar agora)

## API REST v1
Documentação completa em `/api-docs` (dentro da plataforma) e `docs/api/README.md`.
Base: `/api/v1/` — Auth: header `X-API-Key`
Rate limits: 200 req/min, 30 emissões/min

## Bug conhecido corrigido
- `await headers()` dentro do NextAuth `authorize` callback causa `error=Configuration` em produção. Removido — IP tracking desabilitado temporariamente.

## Regras
- Todo serviço sobe como container Docker
- Credenciais NUNCA no GitHub — apenas no Portainer (env vars)
- Ir pelo caminho mais simples e direto
- SEMPRE copiar UI 1:1 do Roteador Webhook
- SEMPRE fazer 2 revisões profundas antes de entregar specs/planos
- Após implementação: atualizar memória, docs, commits e deploy
