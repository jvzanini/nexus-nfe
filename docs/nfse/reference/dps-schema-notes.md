# Notas de leitura do XSD oficial DPS v1.01

Extraído de `schemas/1.01/DPS_v1.01.xsd` + `tiposComplexos_v1.01.xsd` baixados do portal `gov.br/nfse` em 2026-04-10.

## Namespace

```
http://www.sped.fazenda.gov.br/nfse
```

Também importa `xmldsig-core-schema.xsd` (namespace `http://www.w3.org/2000/09/xmldsig#`).

## Estrutura hierárquica do DPS

```
DPS [versao]
└── infDPS [Id — 44 chars: "DPS" + cLocEmi(7) + CNPJ(14) + serie(5) + nDPS(15)]
    ├── tpAmb                  # 1=produção, 2=homologação
    ├── dhEmi                  # UTC datetime (AAAA-MM-DDThh:mm:ssTZD)
    ├── verAplic               # versão do sistema emissor
    ├── serie                  # até 5 chars
    ├── nDPS                   # até 15 chars
    ├── dCompet                # data da prestação (AAAAMMDD)
    ├── tpEmit                 # 1=Prestador, 2=Tomador, 3=Intermediário
    ├── cMotivoEmisTI?         # motivo emissão por Tomador/Intermediário
    ├── chNFSeRej?             # chave NFS-e rejeitada
    ├── cLocEmi                # código IBGE do município emissor (7 dígitos)
    ├── subst?                 # grupo de substituição
    │   ├── chSubstda          # chave da NFS-e original
    │   ├── cMotivo            # 01-05, 99
    │   └── xMotivo?
    ├── prest                  # TCInfoPrestador
    │   ├── [CNPJ | CPF | NIF | cNaoNIF]   # choice
    │   ├── CAEPF?
    │   ├── IM?                # inscrição municipal
    │   ├── xNome?
    │   ├── end?
    │   ├── fone?
    │   ├── email?
    │   └── regTrib            # OBRIGATÓRIO
    │       ├── opSimpNac      # 1=Não, 2=MEI, 3=ME/EPP
    │       ├── regApTribSN?   # só pra ME/EPP
    │       └── regEspTrib     # 0-9 (0=Nenhum é o comum pra MEI)
    ├── toma?                  # TCInfoPessoa
    │   ├── [CNPJ | CPF | NIF | cNaoNIF]
    │   ├── CAEPF?, IM?
    │   ├── xNome              # OBRIGATÓRIO
    │   ├── end?, fone?, email?
    ├── interm?                # TCInfoPessoa
    ├── serv                   # TCServ
    │   ├── locPrest           # local da prestação
    │   ├── cServ              # código do serviço
    │   └── ...
    ├── valores                # TCInfoValores
    └── IBSCBS?                # reforma tributária (IBS+CBS)
```

## Endpoints confirmados (manual v1.0)

### Ambiente de produção restrita
- Base SEFIN: `https://sefin.producaorestrita.nfse.gov.br/SefinNacional`
- Base ADN: `https://adn.producaorestrita.nfse.gov.br/contribuintes`
- Swagger: `https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html`

### Ambiente de produção
- Base SEFIN: `https://sefin.nfse.gov.br/SefinNacional`
- Base ADN: `https://adn.nfse.gov.br/contribuintes`

### API Parâmetros Municipais (SEFIN)
- `GET /parametros_municipais/{cMun}/convenio`
- `GET /parametros_municipais/{cMun}/{cServ}`
- `GET /parametros_municipais/{cMun}/{doc}` (retenções)
- `GET /parametros_municipais/{cMun}/{doc}` (benefícios)

### API NFS-e (SEFIN)
- `POST /nfse` — **emissão SÍNCRONA**. Body JSON: `{"dpsXmlGZipB64": "<base64(gzip(signed_xml))>"}`. Retorna NFS-e ou erro.
- `GET /nfse/{chaveAcesso}` — consulta NFS-e pelo access key

### API DPS (reconciliação — SEFIN)
- `GET /dps/{id}` — recupera chave de acesso a partir do idDps (retorna só se o certificado do solicitante for Prestador/Tomador/Intermediário)
- `HEAD /dps/{id}` — verifica se DPS foi processada (sem revelar chave) — **use pra reconciliação em caso de crash do worker**

### API Eventos (SEFIN)
- `POST /nfse/{chaveAcesso}/eventos` — cancelamento, confirmação do tomador, substituição, etc
- `GET /nfse/{chaveAcesso}/eventos` — lista eventos
- `GET /nfse/{chaveAcesso}/eventos/{tipoEvento}` — filtra por tipo
- `GET /nfse/{chaveAcesso}/eventos/{tipoEvento}/{numSeqEvento}` — evento específico

## Fluxo de request confirmado

1. Build objeto DPS (TypeScript)
2. Serialize pra XML (via xmlbuilder2) seguindo schema
3. Prepend XML declaration `<?xml version="1.0" encoding="UTF-8"?>`
4. Assinar `infDPS` com XMLDSIG usando cert do prestador
5. `gzip(xml)` → `base64(gzipped)` 
6. POST `https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse` com body `{"dpsXmlGZipB64": "..."}`
7. Conexão via mTLS com o mesmo certificado do prestador
8. Resposta: 200 + XML da NFS-e OR 4xx + erro estruturado

## Gotchas críticos

1. **Emissão é SÍNCRONA** — não precisa polling/webhook pra caso normal. Worker só enfileira pra não bloquear UI.
2. **Reconciliação via HEAD /dps/{id}** — antes de re-emitir após crash, checa se a DPS já foi processada. Isso resolve o problema de idempotência.
3. **Substituição é nativa**: pra corrigir uma nota emitida errada, gera novo DPS com `subst.chSubstda` preenchido — a API cancela a original e gera a nova.
4. **Certificado autentica E assina**: mesmo certificado usado em mTLS é usado pra assinar o DPS.
5. **Parametrização municipal precisa vir da API**: alíquotas, regimes, deduções não são hardcoded — consultam `/parametros_municipais`.
6. **Namespace fixo**: `http://www.sped.fazenda.gov.br/nfse`
7. **XMLDSIG signa `infDPS`**, não o root `DPS`.

## Bibliotecas de referência identificadas

- **Rainzart/nfse-nacional** (PHP) — ativa (1.0.15 jan/2026, 64★). Delega assinatura pra NFePHP. Referência pro shape do request.
- **nfe/poc-nfse-nacional** (C#) — POC do NFe.io no evento técnico. Usa mesmos endpoints.
- **OpenAC.Net.NFSe** (C#) — biblioteca mais ampla pra NFS-e.

Não há biblioteca Node/TypeScript maduro pra NFS-e Nacional. Vamos construir in-house usando `xml-crypto` + `node-forge` + `xmlbuilder2` + `zlib` nativo.

## Regras MEI específicas

- `opSimpNac` = `2` (Optante - Microempreendedor Individual)
- `regEspTrib` = `0` (Nenhum) — padrão
- Limite anual faturamento 2026: R$ 81.000 (teto MEI)
- Excesso até 20% (até R$ 97.200): avisa via DASN + DAS complementar
- Excesso > 20%: desenquadramento retroativo

## Código de Tributação Nacional (cServ)

- Lista oficial: ~198 códigos (LC 116/2003)
- Planilha: `anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx`
- Pra MEI o código de tributação nacional é OBRIGATÓRIO; NBS é opcional
- A planilha será parseada e carregada no Postgres como seed
