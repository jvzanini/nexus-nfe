# Ajustes UI Massivos — Spec

## Fase A: Correções visuais urgentes + performance

### A1. Performance — site lento
- Investigar por que toda navegação demora 1-2 min
- Provavelmente queries Prisma sem otimização, ou dev server recompilando
- Verificar se há N+1 queries nas listagens

### A2. Cards empresa — remover lápis/lixeira do hover
- No card da empresa, remover ícones de editar/excluir que aparecem no hover
- No Roteador original NÃO tem esses ícones — edição é DENTRO do detalhe

### A3. Cards empresa — ícone Building2 igual ao Roteador
- O ícone atual não é o mesmo do Roteador
- Usar exatamente o mesmo: div w-11 h-11 rounded-xl bg-muted border border-border/50, Building2 w-5 h-5

### A4. Dialog "Nova Empresa" — ajustes
- Título: "Nova Empresa" (não "Cadastre uma empresa MEI")
- Subtítulo: "Cadastre uma nova empresa. Ao preencher o CNPJ, os dados podem ser carregados automaticamente."
- Ícone do botão Buscar: trocar download por Search
- Remover menção a "MEI" e "BrasilAPI"

### A5. Tabs da empresa — estilo mais sutil
- Tabs estão muito grandes e quadradas
- Copiar 1:1 o TabsList do Roteador: menor, mais arredondado, sem borda grossa
- Tab ativa: background sutil, não quadradão roxo

### A6. Botão Editar — abrir dialog com form de edição
- Copiar 1:1 o EditCompanyDialog do Roteador
- Campos: Nome, Logo URL (opcional), separador, Desativar/Excluir
- Para NFE adaptar: Nome, Nome Fantasia, E-mail, Telefone, Endereço, separador, Desativar/Excluir

### A7. Tab "Configurações" → "Membros"
- Renomear última tab de "Configurações" para "Membros"
- Copiar 1:1 o members-tab.tsx do Roteador
- Tabela: Nível (badge plataforma), Nome, Email, Papel (badge empresa com select), Ações
- "Adicionar Membro" com select de usuários disponíveis
- Regras de acesso: copiar do Roteador (super_admin > company_admin > manager > viewer)
- Precisa criar model CompanyMembership no Prisma (ou reusar lógica de roles)

### A8. Dashboard — alinhar com referência
- Adicionar título "Dashboard" abaixo do "Olá, João"
- Filtro de período: "Hoje", "7 dias", "30 dias" (toggle buttons)
- Filtro de empresa: select "Todas as empresas"
- Botão reload
- Stats cards com dados reais de NFS-e
- Gráfico com Recharts (emissões últimos 30 dias)

## Fase B: Filtros e agrupamento avançado

### B1. Custom Select component
- Copiar 1:1 o CustomSelect do Roteador Webhook
- Usar em TODOS os filtros do sistema (status, empresa, tomador, período)

### B2. Listagem NFS-e (sidebar) — filtros com CustomSelect
- Status: CustomSelect com options coloridas (badge de cada status)
- Empresa: CustomSelect com lista de empresas
- Tomador: CustomSelect com busca + 3 recentes
- Remover botões de status (substituir por select)
- Agrupamento: botões mais destacados com tooltip no hover

### B3. Tab Tomadores — melhorar
- Adicionar campo de busca
- Botão "+ Novo Tomador" em violet-600 (não outline)
- Adicionar ícone de editar (Pencil) em cada linha
- Dialog de edição do tomador
- Contagem no header: "X tomadores"

### B4. Tab Notas Fiscais — padrão de tabela do Roteador
- Tabela no padrão do Roteador (members-tab): cores, fontes, espaçamento
- Coluna Ações: 3 ícones alinhados (Eye, FileText, Download) — sempre alinhados mesmo quando um não está disponível
- Filtros: busca + status select + agrupamento por tomador

### B5. Notas Fiscais (sidebar/principal) — mesmos ajustes
- CustomSelect para status e empresa
- Tomador: CustomSelect com 3 recentes
- Coluna Ações com ícones alinhados
- Agrupamento mais destacado

### B6. Grupos empresariais de tomadores
- Criar model GrupoEmpresarial no Prisma
- Campo grupo no cadastro de tomador
- Filtro e agrupamento por grupo nas listagens

## Fase C: Busca global + gráficos

### C1. Busca global (Command Palette ⌘K)
- Buscar em: Empresas (nome, CNPJ), NFS-e (número, descrição), Tomadores (nome, documento), Endpoints API (path)
- Deep-link: clicar resultado navega para a página correta
- Copiar 1:1 o search-context + command-palette do Roteador
- Já existe command-palette.tsx no projeto — verificar e expandir

### C2. Gráfico na visão geral da empresa
- Recharts BarChart com emissões dos últimos meses
- Barras: autorizadas (emerald) + rejeitadas (red)
- Copiar padrão do overview-chart.tsx do Roteador

### C3. Dashboard com dados reais
- Stats: NFS-e emitidas, empresas ativas, falhas, valor total
- Gráfico: emissões últimos 30 dias (Recharts)
- Tabela: últimas emissões recentes
