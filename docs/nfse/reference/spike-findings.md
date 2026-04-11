# Spike Técnico — Findings Finais (2026-04-10)

Resumo completo da Fase -1 do plano de integração NFS-e Nacional.
**Status: ✅ CONCLUÍDA — pipeline local 100% funcional e validado.**

## 📊 Resultado final dos testes

```
src/lib/nfse/__tests__/dps-id.test.ts              11 passed
src/lib/nfse/__tests__/pfx-loader.test.ts           5 passed
src/lib/nfse/__tests__/xml-builder.test.ts          8 passed (incl. XSD)
src/lib/nfse/__tests__/xml-signer.test.ts           6 passed (incl. xmlsec1)
src/lib/nfse/__tests__/pack.test.ts                 4 passed
src/lib/nfse/__tests__/prepare-submission.test.ts   3 passed

Total: 37 testes, 0 falhas
```

Sanity check end-to-end (`npx tsx scripts/nfse-sanity-check.ts`):
```
✅ PFX gerado (3DES e AES-256)
✅ XML compatível com schema XSD patched
✅ Assinatura XMLDSIG verificada por xmlsec1
✅ Round-trip GZip+Base64 OK
🎉 SPIKE FASE -1: OK (0.11s)
```

## 🟢 O que foi validado localmente (100% de confiança)

1. **Parser PKCS#12** (`node-forge` + `pfx-loader.ts`)
   - Lê .pfx cifrado com 3DES **e AES-256** (padrão ICP-Brasil moderno)
   - Extrai chave privada RSA, certificado X.509, CN, CNPJ/CPF do subject, SHA-1 thumbprint
   - Lança erros amigáveis (senha errada, buffer inválido)

2. **Geração do idDps** (`dps-id.ts`)
   - 45 chars: `DPS`(3) + `cLocEmi`(7) + `tpInsc`(1) + `inscFed`(14) + `serie`(5) + `nDPS`(15)
   - Validação de formato via regex `^DPS\d{7}[12]\d{14}\d{5}\d{15}$`
   - Padding automático com zeros à esquerda

3. **Serialização XML do DPS** (`xml-builder.ts` via `xmlbuilder2`)
   - Namespace correto: `http://www.sped.fazenda.gov.br/nfse`
   - Cobertura do cenário mínimo MEI-DF: prestador CNPJ + tomador CPF + serviço interno + ISSQN tributável
   - **Validado contra `DPS_v1.01.xsd` oficial via `xmllint --schema`** (com schema patched — ver bug abaixo)

4. **Assinatura XMLDSIG** (`xml-signer.ts` via `xml-crypto`)
   - Canonicalização `http://www.w3.org/TR/2001/REC-xml-c14n-20010315`
   - Digest SHA-256, Signature RSA-SHA256
   - `KeyInfo` com `X509Certificate` embedado (base64 sem headers)
   - Reference ao `infDPS` via xpath `local-name()`
   - **Verificado por `xmlsec1 --verify --trusted-pem`** — a assinatura é válida por spec W3C

5. **Empacotamento** (`pack.ts`)
   - `zlib.gzipSync` nativo + `Buffer.toString("base64")`
   - Round-trip lossless testado com caracteres unicode
   - Compressão efetiva (~78% do tamanho em payloads típicos)

6. **Orquestrador** (`prepare-submission.ts`)
   - build → sign → pack em um único call
   - Valida CNPJ/CPF do certificado contra o do prestador antes de assinar
   - Valida expiração do certificado
   - Retorna payload pronto: `{ idDps, xmlAssinado, dpsXmlGZipB64, certThumbprint }`

## 🟡 Endpoints reais pingados (confirmados vivos + confirmam mTLS)

```bash
curl -sI https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse
→ HTTP/1.1 403 Forbidden  (esperado: sem cert client)

curl -sI https://adn.producaorestrita.nfse.gov.br/contribuintes/
→ HTTP/2 496 (SSL Certificate Required)
  "A client certificate must be provided."
```

**Conclusões:**
- ✅ SEFIN (Microsoft-IIS) e ADN (servidor diferente) estão **no ar e respondendo**
- ✅ mTLS é **obrigatório** desde o handshake — confirma o manual
- ⚠️ Swagger da ADN em `/contribuintes/docs/` **também exige cert client** — não conseguimos inspecionar as rotas anonimamente
- 🔴 **DANFS-e PDF permanece incógnita** — precisa cert real pra investigar pelo Swagger

## 🔴 Pendências que dependem de ação externa (não-negociáveis pra Fase 3)

1. **Adesão gov.br Ouro** do CNPJ de teste ao Sistema Nacional NFS-e (manual no portal gov.br/nfse)
2. **Certificado A1 real** (R$80-180/ano ou usar o do MEI do usuário). Sem isso:
   - Não dá pra validar assinatura contra validador da Receita (só validamos contra `xmlsec1` local)
   - Não dá pra acessar o Swagger do ADN pra confirmar endpoint do DANFS-e
   - Não dá pra fazer POST real pra homologação
3. **Fix do bug do schema oficial** — o schema oficial tem `^` e `$` literais no pattern de `TSSerieDPS` (ver abaixo). A API real provavelmente usa um validador interno diferente que aceita valores normais, mas só confirmaremos com submit real.

## 📚 Catálogo NBS / Códigos de Tributação Nacional

Confirmado da planilha oficial (`anexo_b-nbs.xlsx`):
- **LISTA.SERV.NAC** — 580 linhas = códigos LC 116/2003. Estrutura: `item(2) + subitem(2) + desdobroNacional(2) = 6 dígitos`. Linhas com desdobro=0 são headers hierárquicos, só desdobro>0 são emitíveis.
- **LISTA.NBS_v2.0** — 1210 linhas = catálogo NBS complementar (opcional pra MEI)

**Implicação pro plano:** o seed na Fase 1B precisa importar ~580 códigos de tributação (não os 198 que eu tinha estimado inicialmente — Lei Complementar 116/2003 tem muito mais subitens). Ainda é totalmente viável como seed Postgres.

## 🐛 Bug documentado no schema oficial

### TSSerieDPS pattern com `^` e `$` literais

**Arquivo:** `schemas/Schemas/1.01/tiposSimples_v1.01.xsd` linha 161
**Pattern:** `^0{0,4}\d{1,5}$`

**Problema:** Em W3C XSD Regular Expressions (spec oficial e implementação libxml2), `^` e `$` são **caracteres literais**, não anchors — XSD regex é sempre implicitamente anchored. Isso significa que apenas valores tipo `^1$`, `^12345$` validam, o que é nonsense.

**Evidência empírica:**
```
VALUE='1':      fails
VALUE='^1$':    validates
VALUE='01':     fails
VALUE='00001':  fails
VALUE='12345':  fails
```

**Workaround aplicado:** cópia patched do schema em `docs/nfse/reference/schemas-patched/Schemas/1.01/tiposSimples_v1.01.xsd` com pattern corrigido pra `0{0,4}[1-9][0-9]{0,4}`. Usado só localmente pra validação durante dev. O schema oficial fica intocado pra referência futura.

**Verificação pendente:** A API real provavelmente usa um validador interno com interpretação diferente (talvez Java/C# regex que trata `^`/`$` como anchors). Confirmaremos com o primeiro POST em produção restrita.

## 🟠 Gotchas descobertos e documentados

1. **`<serie>` e `<nDPS>` usam valores UNPADDED** — o `idDps` usa padded, mas os elementos XML usam plain numbers. Pattern `TSNumDPS` = `[1-9]{1}[0-9]{0,14}` exige começar com nonzero.

2. **Datas**: `dCompet` = `AAAA-MM-DD`, `dhEmi` = `AAAA-MM-DDThh:mm:ss±hh:mm`. Use `-03:00` explícito (horário Brasília) em vez de `Z` — o schema aceita offset, mas a clareza ajuda.

3. **`cTribNac`**: 6 dígitos numéricos sem pontos. Ex: `010101` pra Consultoria em TI.

4. **Regime MEI**: `opSimpNac=2` + `regEspTrib=0` é o padrão. MEI opta por Simples Nacional mas sem regime especial.

5. **`totTrib` é obrigatório**: pra MEI, usar `pTotTribSN` com a alíquota do Simples Nacional (ex: 5.00 pra 5%).

6. **`tpRetISSQN=1`**: "Não retido" é o padrão quando o tomador não retém ISS na fonte (cenário mais comum pra MEI).

## 🎯 Confiança no plano

**~90% de confiança** no caminho técnico. Os 10% restantes dependem de:
- Comportamento real do validador da Receita (vs `xmllint` local)
- Se `xml-crypto` produz XMLDSIG que o servidor aceita (canonicalização pode ter quirks)
- Fonte do DANFS-e PDF (API do ADN ou render local)

Esses 3 pontos são **impossíveis de validar sem cert A1 real** e adesão gov.br Ouro. Nenhum deles é um risco de "o plano não funciona" — são ajustes de detalhe quando tivermos acesso.

## ⏭️ Continuação em outro terminal

O estado atual está persistido em:

**Código** (37 testes passando):
- `src/lib/nfse/*.ts` — 8 arquivos
- `src/lib/nfse/__tests__/*.test.ts` — 6 arquivos
- `scripts/nfse-sanity-check.ts` — script end-to-end

**Documentação:**
- `docs/superpowers/plans/2026-04-10-nfse-direct-integration.md` — plano v2 completo
- `docs/nfse/reference/dps-schema-notes.md` — mapeamento do XSD
- `docs/nfse/reference/spike-findings.md` — este arquivo
- `docs/nfse/reference/schemas/` — schemas XSD oficiais (imutáveis)
- `docs/nfse/reference/schemas-patched/` — schemas com fix local do bug

**CLAUDE.md do projeto** atualizado com o estado atual.

**Próximo passo quando retomar:**
1. **Começar Fase 1A** (cadastro MEI + upload certificado) — já pode rodar sem depender de ação externa
2. **Em paralelo, usuário deve obter:** cert A1 real + adesão gov.br Ouro com CNPJ de teste
3. Quando os dois acima estiverem prontos, retomar Fase 3 (mTLS submit real em produção restrita)
