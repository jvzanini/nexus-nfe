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
- ✅ **Fase 1B** — Catálogo NBS + Parâmetros Municipais + Numeração DPS (82 testes passando)
  - Seed de ~580 códigos de tributação nacional (LC 116/2003) via parser XLSX
  - Busca por código/descrição com autocomplete (componente NbsSelector)
  - Wrapper de parâmetros municipais (mock, mTLS real na Fase 3)
  - Numeração atômica de DPS (SELECT FOR UPDATE)

### Próximo: Fase 2 — DPS Builder completo
Plano detalhado em:
`docs/superpowers/plans/2026-04-10-nfse-direct-integration.md`

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
- `__tests__/` — 11 arquivos, 82 testes

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
