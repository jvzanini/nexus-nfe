# Nexus NFE — API REST v1

API para emissão automatizada de NFS-e para MEIs via gov.br/nfse.

**Base URL:** `https://nfe.nexusai360.com/api/v1`
**Autenticação:** API Key via header `X-API-Key`

---

## Autenticação

Todas as requisições devem incluir o header:

```
X-API-Key: nxnfe_sua_chave_aqui
```

API Keys são geradas pelo super admin na interface ou via CLI:
```bash
npx tsx scripts/create-api-key.ts "nome-da-chave"
```

---

## Formato de Resposta

### Sucesso
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 50, "limit": 20, "page": 1 }
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION",
    "message": "Descrição do erro em português"
  }
}
```

---

## Endpoints

### NFS-e

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/nfse` | Listar NFS-e com filtros e paginação |
| `POST` | `/nfse` | Criar rascunho de NFS-e |
| `GET` | `/nfse/{id}` | Detalhes completos de uma NFS-e |
| `POST` | `/nfse/{id}/emitir` | Enfileirar rascunho para emissão |
| `POST` | `/nfse/{id}/cancelar` | Cancelar NFS-e autorizada |
| `GET` | `/nfse/{id}/xml` | Download do XML (assinado ou autorizado) |

### Clientes MEI

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/clientes` | Listar clientes MEI |
| `GET` | `/clientes/{id}` | Detalhes do cliente (endereço, certificado, faturamento) |
| `GET` | `/clientes/{id}/faturamento` | Faturamento anual com faixas de limite MEI |

### Catálogo

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/catalogo/nbs` | Buscar códigos de tributação nacional (LC 116/2003) |

---

## Referência Detalhada

### GET /nfse

Lista NFS-e com filtros opcionais e paginação.

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `clienteMeiId` | uuid | — | Filtrar por cliente MEI |
| `status` | string | — | Filtrar por status: `rascunho`, `pendente`, `processando`, `autorizada`, `rejeitada`, `cancelada`, `erro` |
| `limit` | int | 50 | Máximo 200 |
| `offset` | int | 0 | Paginação |

**Exemplo:**
```bash
curl -H "X-API-Key: $KEY" \
  "https://nfe.nexusai360.com/api/v1/nfse?status=autorizada&limit=10"
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "idDps": "DPS5300108112345678000190000100000000000001",
      "serie": "00001",
      "numero": "1",
      "status": "autorizada",
      "ambiente": "producao_restrita",
      "descricaoServico": "Consultoria em TI",
      "codigoServico": "010101",
      "tomadorNome": "João da Silva",
      "tomadorDocumento": "12345678909",
      "tomadorTipo": "cpf",
      "valorServico": "1500.00",
      "aliquotaIss": "2.00",
      "valorIss": "30.00",
      "dataEmissao": "2026-04-12T14:30:00.000Z",
      "chaveAcesso": "NFSe530010812345...",
      "numeroNfse": "000000001",
      "clienteMei": {
        "id": "uuid",
        "cnpj": "12345678000190",
        "razaoSocial": "Minha Empresa MEI"
      }
    }
  ],
  "meta": { "total": 42, "limit": 10, "page": 1 }
}
```

---

### POST /nfse

Cria um rascunho de NFS-e. O rascunho recebe automaticamente um número DPS sequencial.

**Body (JSON):**
```json
{
  "clienteMeiId": "uuid do cliente MEI",
  "codigoTributacaoNacional": "010101",
  "descricaoServico": "Desenvolvimento de sistema web",
  "localPrestacaoIbge": "5300108",
  "tomadorTipo": "cpf",
  "tomadorDocumento": "12345678909",
  "tomadorNome": "João da Silva",
  "tomadorEmail": "joao@email.com",
  "valorServico": 1500.00,
  "aliquotaIss": 2.0,
  "tributacaoIssqn": 1
}
```

**Campos opcionais:** `codigoNbs`, `tomadorEmail`, `tomadorCep`, `tomadorLogradouro`, `tomadorNumero`, `tomadorComplemento`, `tomadorBairro`, `tomadorMunicipioIbge`

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "idDps": "DPS5300108112345678000190000100000000000002",
    "serie": "00001",
    "numero": "2",
    "status": "rascunho"
  }
}
```

---

### POST /nfse/{id}/emitir

Enfileira um rascunho para emissão via gov.br/nfse. O worker BullMQ processa: monta DPS XML, assina com certificado A1 do cliente, empacota (GZip+Base64), faz POST ao SEFIN com mTLS.

**Validações:**
- NFS-e deve estar em status `rascunho`
- Cliente MEI deve estar ativo
- Cliente deve ter certificado digital A1 válido (não expirado, não revogado)

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pendente",
    "jobId": "bullmq-job-id"
  }
}
```

**Fluxo assíncrono:** O status evolui: `rascunho` → `pendente` → `processando` → `autorizada` (ou `rejeitada`/`erro`). Polling via `GET /nfse/{id}` para acompanhar.

---

### POST /nfse/{id}/cancelar

Cancela uma NFS-e autorizada. Só permite dentro de 24h da autorização.

**Body:**
```json
{
  "motivo": "Erro na descrição do serviço prestado"
}
```

**Erros possíveis:**
- `422 INVALID_STATUS` — NFS-e não está autorizada
- `422 DEADLINE_EXPIRED` — Prazo de 24h expirado (usar substituição)
- `422 VALIDATION` — Motivo muito curto (mínimo 5 caracteres)

---

### GET /nfse/{id}/xml

Retorna o XML da NFS-e (autorizado se disponível, senão o assinado).

**Response:** `Content-Type: application/xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="DPS530010811234567800019000001000000000000001">
    ...
  </infDPS>
  <Signature>...</Signature>
</DPS>
```

---

### GET /clientes

Lista clientes MEI cadastrados.

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `active` | bool | — | Filtrar por status (true/false) |
| `limit` | int | 50 | Máximo 200 |
| `offset` | int | 0 | Paginação |

**Resposta inclui:** status do certificado digital (válido/expirado), total de NFS-e emitidas.

---

### GET /clientes/{id}

Detalhes completos do cliente MEI incluindo endereço, certificado digital e faturamento do ano corrente.

---

### GET /clientes/{id}/faturamento

Faturamento anual do cliente com cálculo de faixas do limite MEI (R$ 81.000/ano).

**Query:** `ano` (default: ano atual)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "ano": 2026,
    "totalEmitido": 45000.00,
    "quantidadeNotas": 15,
    "limite": 81000,
    "percentual": 55.6,
    "limiteExcedido": false,
    "faixa": "ok"
  }
}
```

**Faixas:**
| Faixa | Percentual | Significado |
|-------|-----------|-------------|
| `ok` | ≤ 80% | Dentro do limite |
| `atencao` | 80-100% | Próximo do limite |
| `alerta` | 100-120% | Excedeu, mas dentro da tolerância de 20% (DAS complementar) |
| `bloqueado` | > 120% | Risco de desenquadramento retroativo |

---

### GET /catalogo/nbs

Busca códigos de tributação nacional (LC 116/2003).

**Query:** `q` (mínimo 2 chars) — busca por código (prefixo) ou descrição (case-insensitive)

**Exemplo:**
```bash
curl -H "X-API-Key: $KEY" \
  "https://nfe.nexusai360.com/api/v1/catalogo/nbs?q=consultoria"
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "codigo": "010101",
      "descricao": "Análise e desenvolvimento de sistemas.",
      "nivel": 2,
      "aliquotaMin": null,
      "aliquotaMax": null
    }
  ]
}
```

---

## Códigos de Erro

| Código HTTP | Code | Descrição |
|-------------|------|-----------|
| 401 | — | API Key inválida ou ausente |
| 404 | NOT_FOUND | Recurso não encontrado |
| 422 | VALIDATION | Dados inválidos |
| 422 | INVALID_STATUS | Operação incompatível com o status atual |
| 422 | NO_CERTIFICATE | Cliente sem certificado digital válido |
| 422 | CLIENT_INACTIVE | Cliente MEI inativo |
| 422 | DEADLINE_EXPIRED | Prazo de cancelamento expirado |
| 500 | 500 | Erro interno |

---

## Fluxo de Emissão Completo

```
1. POST /nfse                    → cria rascunho (status: rascunho)
2. POST /nfse/{id}/emitir        → enfileira (status: pendente → processando)
3. GET  /nfse/{id}               → polling até autorizada/rejeitada
4. GET  /nfse/{id}/xml           → download do XML autorizado
```

**Pipeline interno do worker:**
```
rascunho → pendente → [worker pega] → processando
  → carrega certificado A1 criptografado do banco
  → descriptografa PFX + senha (AES-256-GCM)
  → monta objeto DPS (TypeScript)
  → serializa XML (xmlbuilder2)
  → assina XMLDSIG (xml-crypto, RSA-SHA256)
  → comprime GZip + Base64
  → POST gov.br/nfse com mTLS
  → autorizada (salva chave, XML, número)
  → ou rejeitada/erro (salva código + mensagem)
```

---

## Rate Limits

- 100 requisições por minuto por API Key
- Emissão: máximo 10 por minuto por cliente MEI

---

## Ambientes

| Ambiente | Base URL SEFIN | Descrição |
|----------|---------------|-----------|
| Homologação | `sefin.producaorestrita.nfse.gov.br` | Testes (default) |
| Produção | `sefin.nfse.gov.br` | Notas fiscais reais |

O ambiente é configurado pelo super admin via `AMBIENTE_NFSE` nas configurações globais.
