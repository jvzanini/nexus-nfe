import {
  detectSeparator,
  parseCsvLine,
  normalizeHeader,
  parseValorBr,
  parseDataBr,
  splitCsvLines,
  onlyDigits,
  isValidCpf,
  isValidCnpj,
} from "./csv-parser";
import type { ServicoPadraoInput } from "@/lib/validation/nfse-lote";

export interface LoteItemValido {
  linha: number;
  tipo: "cpf" | "cnpj";
  documento: string;
  nome: string;
  email: string | null;
  valorServico: number;
  descricaoServico: string;
  dataCompetencia: Date;
}

export interface LoteItemInvalido {
  linha: number;
  motivo: string;
  raw: string;
}

export interface LoteBloqueio {
  tipo:
    | "empresa_inativa"
    | "sem_certificado"
    | "certificado_expirado"
    | "limite_mei"
    | "rate_limit_lotes"
    | "limite_itens"
    | "servico_padrao_invalido";
  mensagem: string;
}

export interface LotePreviewResult {
  totalLinhas: number;
  validos: LoteItemValido[];
  invalidos: LoteItemInvalido[];
  duplicadosPlanilha: number;
  totalValor: number;
  totalIss: number;
  bloqueios: LoteBloqueio[];
}

export interface PreviewContext {
  empresaAtiva: boolean;
  certificadoValido: boolean;
  certificadoExpirado: boolean;
  faturamentoAtualReais: number;
  limiteMeiReais: number;
  empresaEhMei: boolean;
  lotesSimultaneosAbertos: number;
  maxLotesSimultaneos: number;
  maxItens: number;
}

const MIN_DESCRICAO = 5;
const MAX_DESCRICAO = 2000;

/**
 * Executa o preview (puro, sem IO). Valida CSV linha-a-linha e aplica bloqueios
 * globais a partir do contexto.
 */
export function previewLoteCore(
  servicoPadrao: ServicoPadraoInput,
  csvText: string,
  ctx: PreviewContext
): LotePreviewResult {
  const bloqueios: LoteBloqueio[] = [];

  if (!ctx.empresaAtiva) {
    bloqueios.push({
      tipo: "empresa_inativa",
      mensagem: "Empresa inativa — ativar antes de criar lote",
    });
  }
  if (ctx.certificadoExpirado) {
    bloqueios.push({
      tipo: "certificado_expirado",
      mensagem: "Certificado A1 expirado — renovar antes de emitir em lote",
    });
  } else if (!ctx.certificadoValido) {
    bloqueios.push({
      tipo: "sem_certificado",
      mensagem: "Empresa sem certificado A1 ativo",
    });
  }
  if (ctx.lotesSimultaneosAbertos >= ctx.maxLotesSimultaneos) {
    bloqueios.push({
      tipo: "rate_limit_lotes",
      mensagem: `Empresa já possui ${ctx.lotesSimultaneosAbertos} lotes em andamento (limite ${ctx.maxLotesSimultaneos}). Aguarde ou cancele antes de criar outro`,
    });
  }

  const lines = splitCsvLines(csvText);

  if (lines.length < 2) {
    return {
      totalLinhas: 0,
      validos: [],
      invalidos: [],
      duplicadosPlanilha: 0,
      totalValor: 0,
      totalIss: 0,
      bloqueios: [
        ...bloqueios,
        {
          tipo: "servico_padrao_invalido",
          mensagem: "CSV vazio ou sem dados além do cabeçalho",
        },
      ],
    };
  }

  const sep = detectSeparator(lines[0]);
  const header = parseCsvLine(lines[0], sep).map(normalizeHeader);
  const idx = (name: string) => header.indexOf(name);

  const idxDoc = idx("documento");
  const idxNome = idx("nome");
  const idxValor = idx("valor_servico");
  const idxEmail = idx("email");
  const idxDesc = idx("descricao_servico");
  const idxData = idx("data_competencia");

  if (idxDoc === -1 || idxNome === -1 || idxValor === -1) {
    return {
      totalLinhas: lines.length - 1,
      validos: [],
      invalidos: [],
      duplicadosPlanilha: 0,
      totalValor: 0,
      totalIss: 0,
      bloqueios: [
        ...bloqueios,
        {
          tipo: "servico_padrao_invalido",
          mensagem:
            "CSV precisa ter cabeçalho com colunas 'documento', 'nome' e 'valor_servico'",
        },
      ],
    };
  }

  const validos: LoteItemValido[] = [];
  const invalidos: LoteItemInvalido[] = [];
  const docsVistos = new Set<string>();
  let duplicadosPlanilha = 0;

  const hoje = new Date();
  const mesAtual = hoje.getUTCMonth();
  const anoAtual = hoje.getUTCFullYear();
  const limiteMinMes = new Date(Date.UTC(anoAtual, mesAtual - 1, 1));
  const limiteMaxMes = new Date(
    Date.UTC(anoAtual, mesAtual + 1, 0, 23, 59, 59)
  );

  let totalValor = 0;
  let totalIss = 0;

  for (let i = 1; i < lines.length; i++) {
    const linhaHumano = i + 1;
    const fields = parseCsvLine(lines[i], sep);
    const documento = onlyDigits(fields[idxDoc] ?? "");
    const nome = (fields[idxNome] ?? "").trim();
    const valorRaw = (fields[idxValor] ?? "").trim();
    const email =
      idxEmail >= 0 ? (fields[idxEmail] ?? "").trim() || null : null;
    const descRaw =
      idxDesc >= 0 ? (fields[idxDesc] ?? "").trim() : "";
    const dataRaw =
      idxData >= 0 ? (fields[idxData] ?? "").trim() : "";

    if (!documento) {
      invalidos.push({ linha: linhaHumano, motivo: "Documento vazio", raw: lines[i] });
      continue;
    }
    let tipo: "cpf" | "cnpj";
    if (documento.length === 11) {
      if (!isValidCpf(documento)) {
        invalidos.push({ linha: linhaHumano, motivo: "CPF inválido", raw: lines[i] });
        continue;
      }
      tipo = "cpf";
    } else if (documento.length === 14) {
      if (!isValidCnpj(documento)) {
        invalidos.push({ linha: linhaHumano, motivo: "CNPJ inválido", raw: lines[i] });
        continue;
      }
      tipo = "cnpj";
    } else {
      invalidos.push({
        linha: linhaHumano,
        motivo: `Documento com ${documento.length} dígitos (esperado 11 ou 14)`,
        raw: lines[i],
      });
      continue;
    }

    if (!nome || nome.length < 2) {
      invalidos.push({ linha: linhaHumano, motivo: "Nome vazio ou muito curto", raw: lines[i] });
      continue;
    }
    if (nome.length > 200) {
      invalidos.push({ linha: linhaHumano, motivo: "Nome excede 200 caracteres", raw: lines[i] });
      continue;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      invalidos.push({ linha: linhaHumano, motivo: "E-mail inválido", raw: lines[i] });
      continue;
    }

    const valor = parseValorBr(valorRaw);
    if (valor === null) {
      invalidos.push({ linha: linhaHumano, motivo: "Valor inválido", raw: lines[i] });
      continue;
    }
    if (valor <= 0 || valor > 999_999_999.99) {
      invalidos.push({ linha: linhaHumano, motivo: "Valor fora do intervalo aceito", raw: lines[i] });
      continue;
    }

    const descFinal = descRaw || servicoPadrao.descricaoServico;
    if (descFinal.length < MIN_DESCRICAO || descFinal.length > MAX_DESCRICAO) {
      invalidos.push({
        linha: linhaHumano,
        motivo: `Descrição fora do tamanho permitido (${MIN_DESCRICAO}-${MAX_DESCRICAO})`,
        raw: lines[i],
      });
      continue;
    }

    let dataComp: Date;
    if (dataRaw) {
      const parsed = parseDataBr(dataRaw);
      if (!parsed) {
        invalidos.push({ linha: linhaHumano, motivo: "Data inválida (use DD/MM/YYYY)", raw: lines[i] });
        continue;
      }
      dataComp = parsed;
    } else {
      dataComp = new Date(Date.UTC(anoAtual, mesAtual, hoje.getUTCDate()));
    }

    if (dataComp < limiteMinMes || dataComp > limiteMaxMes) {
      invalidos.push({
        linha: linhaHumano,
        motivo: "Data de competência fora da janela (mês atual ou anterior)",
        raw: lines[i],
      });
      continue;
    }

    if (docsVistos.has(documento)) {
      duplicadosPlanilha++;
      continue;
    }
    docsVistos.add(documento);

    validos.push({
      linha: linhaHumano,
      tipo,
      documento,
      nome,
      email,
      valorServico: valor,
      descricaoServico: descFinal,
      dataCompetencia: dataComp,
    });

    totalValor += valor;
    totalIss += (valor * servicoPadrao.aliquotaIss) / 100;
  }

  if (validos.length > ctx.maxItens) {
    bloqueios.push({
      tipo: "limite_itens",
      mensagem: `Lote tem ${validos.length} itens válidos, acima do limite de ${ctx.maxItens}`,
    });
  }

  if (ctx.empresaEhMei && ctx.limiteMeiReais > 0) {
    if (ctx.faturamentoAtualReais + totalValor > ctx.limiteMeiReais) {
      bloqueios.push({
        tipo: "limite_mei",
        mensagem: `Soma do lote (R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) + faturamento atual (R$ ${ctx.faturamentoAtualReais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) ultrapassa o limite MEI (R$ ${ctx.limiteMeiReais.toLocaleString("pt-BR")})`,
      });
    }
  }

  return {
    totalLinhas: lines.length - 1,
    validos,
    invalidos,
    duplicadosPlanilha,
    totalValor,
    totalIss,
    bloqueios,
  };
}
