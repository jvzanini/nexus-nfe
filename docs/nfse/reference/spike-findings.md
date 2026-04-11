# Spike Técnico — Findings (2026-04-10)

Resumo dos aprendizados da Fase -1 do plano de integração NFS-e Nacional.

## ✅ O que funcionou

### 1. Parser de .pfx com node-forge
- `src/lib/nfse/pfx-loader.ts` lê arquivos PKCS#12, extrai chave privada RSA + certificado X.509
- Extrai CNPJ/CPF do Common Name (padrão ICP-Brasil: "NOME:DOC")
- Calcula SHA-1 thumbprint pro armazenamento único no banco
- Lança erros amigáveis quando senha errada ou arquivo corrompido
- 5 testes passando com cert self-signed gerado em memória

### 2. Geração do Id do DPS (44 chars + 1 tipoInscricao = 45 chars total)
- Descoberto que o Id tem **45 caracteres**, não 44 como mencionado no TabNews
- Formato: `DPS` (3) + `cLocEmi` (7) + `tpInsc` (1) + `inscFed` (14) + `serie` (5) + `nDPS` (15) = 45
- `src/lib/nfse/dps-id.ts` com 11 testes cobrindo validações, padding, edge cases

### 3. Serialização XML do DPS
- `src/lib/nfse/xml-builder.ts` gera XML usando xmlbuilder2
- Namespace correto: `http://www.sped.fazenda.gov.br/nfse`
- Atributos posicionados corretamente: `DPS[versao]`, `infDPS[Id]`
- Cobertura do cenário mínimo MEI-DF: prestador CNPJ + tomador CPF + serviço interno + valores básicos
- 8 testes passando incluindo **validação contra XSD oficial via `xmllint --schema`**

## ⚠️ Problemas encontrados e resolvidos

### Bug 1: Schema oficial tem regex pattern com `^` e `$` literais
**Impacto:** alto — bloqueia validação local contra schema oficial.

**Detalhes:**
O arquivo `tiposSimples_v1.01.xsd` define `TSSerieDPS` com pattern `^0{0,4}\d{1,5}$`. Em W3C XSD Regular Expressions (usado pelo libxml2), `^` e `$` são **caracteres literais**, não anchors — XSD regex é sempre implicitamente anchored. Isso significa que literalmente **nenhum valor de série comum valida**, só strings como `^1$`, `^12345$`, etc.

**Evidência:**
```
VALUE='1': fails to validate
VALUE='^1$': validates
VALUE='01': fails to validate
VALUE='00001': fails to validate
VALUE='12345': fails to validate
```

**Mitigação aplicada:**
Criada cópia patched do schema em `docs/nfse/reference/schemas-patched/` com o pattern corrigido pra `0{0,4}[1-9][0-9]{0,4}`. Usada só localmente pra validação durante dev. Os XMLs gerados seguem a intenção do pattern (sem leading zeros problemáticos).

**Verificação pendente (Fase 3):**
Testar em produção restrita se a API real aceita valores como `1`, `00001`, `12345`. Provavelmente sim, porque a API deve usar um validador interno diferente do xmllint.

### Bug 2: Elementos `<serie>` e `<nDPS>` devem usar valores UNPADDED
**Impacto:** médio — tipo de erro fácil de cair na primeira implementação.

**Detalhes:**
O `idDps` usa valores padded (serie 5 chars, nDPS 15 chars com zeros à esquerda). Mas os elementos XML `<serie>` e `<nDPS>` dentro de `infDPS` devem usar os valores **sem padding** — o pattern do `TSNumDPS` é `[1-9]{1}[0-9]{0,14}` (tem que começar com nonzero).

**Solução:**
- `Dps.infDps.serie` e `Dps.infDps.numero` armazenam valores plain (ex: "1", "42")
- `buildIdDps()` padroniza internamente quando gera o ID
- O XML usa os valores plain diretamente

## 🔍 Gotchas descobertos

1. **Pattern de TSNumDPS**: `[1-9]{1}[0-9]{0,14}` — número não pode começar com 0. O valor é o natural number em string.

2. **Datas**: `dCompet` usa formato `AAAA-MM-DD` (tipo `TSData`), `dhEmi` usa formato `AAAA-MM-DDThh:mm:ss±hh:mm` (tipo `TSDateTimeUTC`). A documentação diz UTC mas o schema aceita offset explícito — uso `-03:00` (horário de Brasília) pra evitar confusão.

3. **Código de tributação nacional (`cTribNac`)**: 6 dígitos numéricos sem pontos. Formato: 2 (item LC 116) + 2 (subitem) + 2 (desdobro). Ex: `010101` pra Consultoria.

4. **Regime tributário do prestador**: `opSimpNac=2` + `regEspTrib=0` é o padrão MEI.

5. **Tributação municipal**: `tribMun` precisa de `tribISSQN` (1=tributável), `tpRetISSQN` (1=não retido), `pAliq` (alíquota).

6. **totTrib**: é obrigatório. Usar `pTotTribSN` com a alíquota do Simples Nacional pro caso MEI.

## 📊 Status dos testes do spike

```
src/lib/nfse/__tests__/dps-id.test.ts       11 passed
src/lib/nfse/__tests__/pfx-loader.test.ts    5 passed
src/lib/nfse/__tests__/xml-builder.test.ts   8 passed (incl. XSD validation)
```

**Total: 24 testes passando, 0 falhando.**

## 🎯 Próximos passos (ainda dentro da Fase -1)

- [ ] Implementar `src/lib/nfse/xml-signer.ts` usando xml-crypto
- [ ] Validar assinatura XMLDSIG com `xmlsec1 --verify`
- [ ] Implementar `src/lib/nfse/pack.ts` (GZip + Base64)
- [ ] Script `scripts/nfse-sanity-check.ts` que roda tudo end-to-end
- [ ] Investigar endpoint de DANFS-e no Swagger oficial
- [ ] Tentar primeiro envio real pra produção restrita (requer cert A1 real + adesão gov.br)

## 💡 Implicações pro plano

- **Fase -1 segue viável** — spike parcial já comprova que gerar DPS estruturalmente correto é tratável
- **O schema patched** precisa ser mantido no repo pra CI e dev; schema oficial fica como referência imutável
- **Fase 3 (mTLS + submit real)** precisa de cert A1 real ANTES de começar — não dá pra avançar sem
- **Investigação pendente**: decisão sobre DANFS-e PDF (API do ADN ou render local)
- **Estimativa do plano confirma-se realista**: 3-4 meses pra produção. O XML builder sozinho levou ~1h só do cenário mínimo; cobrir TODOS os cenários do XSD + testes + assinatura + mTLS é trabalho substantivo.
