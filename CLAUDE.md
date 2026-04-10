# Nexus NFE

## Projeto
Emissão automatizada de notas fiscais para MEIs via GOV.BR

**URL Produção:** https://nfe.nexusai360.com
**Repositório:** https://github.com/jvzanini/nexus-nfe
**Blueprint:** github.com/jvzanini/nexus-ai-blueprint (v2.0.0)
**Tipo:** Interno Nexus AI
**Criado em:** 2026-04-10

## Metodologia
Este projeto segue a metodologia do Blueprint Nexus AI:
1. **Criação** — `/nexus-ai-blueprint:criar` (concluída)
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

## Fase 1 — Esqueleto (atual)
Login, Users, Profile, Dashboard, Settings. Sem lógica de emissão ainda.

## Fase 2 — Motor de Emissão NFE MEI (a brainstormar)
Pesquisar: API oficial do GOV.BR / Receita Federal pra emissão de NFe MEI no DF. Se não houver API, avaliar automação (Playwright) pra navegação no painel do GOV.BR. Modelar: Cliente MEI (CNPJ, credenciais), NFe (produto/serviço, valor, status), histórico de emissões.

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
