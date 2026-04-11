// Serializador de DPS pra XML compatível com o schema oficial
// DPS_v1.01.xsd (http://www.sped.fazenda.gov.br/nfse)
//
// Cobertura inicial (cenário mínimo MEI do DF):
// - Prestador CNPJ MEI com endereço nacional + regime tributário MEI
// - Tomador pessoa física com CPF e nome (sem endereço)
// - Serviço com localPrestação nacional + código tributação nacional
// - Valores com ISSQN tributável + total trib via pTotTribSN
//
// Cenários ainda não cobertos (serão adicionados conforme a demanda):
// - Tomador PJ, intermediário, endereço do tomador
// - Substituição (subst)
// - Comércio exterior, obra, evento
// - Retenção de ISS
// - PIS/COFINS/CSLL
// - Reforma tributária (IBSCBS)

import { create } from "xmlbuilder2";
import type { Dps, InfDps, Prestador, Tomador } from "./types";
import { NFSE_NAMESPACE } from "./types";

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function formatDateIso(date: Date): string {
  // "AAAA-MM-DD"
  return date.toISOString().slice(0, 10);
}

function formatDateTimeUtc(date: Date): string {
  // Formato: AAAA-MM-DDThh:mm:ss-03:00 (Brasília)
  // Simplificação: UTC Z também é válido conforme schema (aceita +hh:mm ou -hh:mm)
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = "-03:00"; // Brasília
  // Converte pro horário de Brasília
  const brasilia = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return (
    `${brasilia.getUTCFullYear()}-${pad(brasilia.getUTCMonth() + 1)}-${pad(
      brasilia.getUTCDate()
    )}T${pad(brasilia.getUTCHours())}:${pad(brasilia.getUTCMinutes())}:${pad(
      brasilia.getUTCSeconds()
    )}${offset}`
  );
}

function buildPrestadorNode(prestador: Prestador) {
  const node: Record<string, unknown> = {};

  // Choice: CNPJ | CPF | NIF
  if (prestador.tipoDocumento === "cnpj") {
    node.CNPJ = prestador.documento;
  } else if (prestador.tipoDocumento === "cpf") {
    node.CPF = prestador.documento;
  } else {
    node.NIF = prestador.documento;
  }

  if (prestador.inscricaoMunicipal) {
    node.IM = prestador.inscricaoMunicipal;
  }

  if (prestador.nome) {
    node.xNome = prestador.nome;
  }

  if (prestador.endereco) {
    node.end = buildEnderecoNode(prestador.endereco);
  }

  if (prestador.telefone) {
    node.fone = prestador.telefone;
  }

  if (prestador.email) {
    node.email = prestador.email;
  }

  // regTrib é obrigatório
  node.regTrib = {
    opSimpNac: String(prestador.regimeTributario.opcaoSimplesNacional),
    regEspTrib: String(prestador.regimeTributario.regimeEspecialTributacao),
  };

  return node;
}

function buildTomadorNode(tomador: Tomador) {
  const node: Record<string, unknown> = {};

  if (tomador.tipoDocumento === "cnpj") {
    node.CNPJ = tomador.documento;
  } else if (tomador.tipoDocumento === "cpf") {
    node.CPF = tomador.documento;
  } else {
    node.NIF = tomador.documento;
  }

  if (tomador.inscricaoMunicipal) {
    node.IM = tomador.inscricaoMunicipal;
  }

  node.xNome = tomador.nome; // Obrigatório pro tomador

  if (tomador.endereco) {
    node.end = buildEnderecoNode(tomador.endereco);
  }

  if (tomador.telefone) {
    node.fone = tomador.telefone;
  }

  if (tomador.email) {
    node.email = tomador.email;
  }

  return node;
}

function buildEnderecoNode(endereco: NonNullable<Prestador["endereco"]>) {
  if (endereco.tipo === "nacional") {
    const node: Record<string, unknown> = {
      endNac: {
        cMun: endereco.municipioIbge,
        CEP: endereco.cep,
      },
      xLgr: endereco.logradouro,
      nro: endereco.numero,
    };
    if (endereco.complemento) {
      node.xCpl = endereco.complemento;
    }
    node.xBairro = endereco.bairro;
    return node;
  }

  // Exterior
  const node: Record<string, unknown> = {
    endExt: {
      cPais: endereco.codigoPaisIso,
      cEndPost: endereco.codigoEnderecamentoPostal,
      xCidade: endereco.cidade,
      xEstProvReg: endereco.estadoProvinciaRegiao,
    },
    xLgr: endereco.logradouro,
    nro: endereco.numero,
  };
  if (endereco.complemento) {
    node.xCpl = endereco.complemento;
  }
  node.xBairro = endereco.bairro;
  return node;
}

function buildServicoNode(servico: InfDps["servico"]) {
  const node: Record<string, unknown> = {
    locPrest: {
      cLocPrestacao: servico.localPrestacao.municipioIbge,
    },
    cServ: {
      cTribNac: servico.codigoServico.codigoTributacaoNacional,
      ...(servico.codigoServico.codigoTributacaoMunicipal
        ? { cTribMun: servico.codigoServico.codigoTributacaoMunicipal }
        : {}),
      xDescServ: servico.codigoServico.descricao,
      ...(servico.codigoServico.codigoNbs
        ? { cNBS: servico.codigoServico.codigoNbs }
        : {}),
    },
  };
  return node;
}

function buildValoresNode(valores: InfDps["valores"]) {
  // TCInfoValores: vServPrest (obrig) + vDescCondIncond? + vDedRed? + trib (obrig)
  const node: Record<string, unknown> = {
    vServPrest: {
      vServ: formatMoney(valores.valorServico),
    },
    trib: {
      tribMun: {
        tribISSQN: String(valores.tributacaoIssqn),
        tpRetISSQN: "1", // Não retido (padrão pra MEI)
        pAliq: formatMoney(valores.aliquotaIss),
      },
      // totTrib é obrigatório, usa pTotTribSN pra Simples Nacional
      totTrib: {
        pTotTribSN: formatMoney(valores.aliquotaIss),
      },
    },
  };
  return node;
}

function buildInfDpsNode(inf: InfDps): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@Id": inf.id,
    tpAmb: String(inf.tipoAmbiente),
    dhEmi: formatDateTimeUtc(inf.dataHoraEmissao),
    verAplic: inf.versaoAplicativo,
    serie: inf.serie,
    nDPS: inf.numero,
    dCompet: formatDateIso(inf.dataCompetencia),
    tpEmit: String(inf.tipoEmitente),
    cLocEmi: inf.codigoLocalEmissao,
  };

  if (inf.substituicao) {
    node.subst = {
      chSubstda: inf.substituicao.chaveSubstituida,
      cMotivo: inf.substituicao.codigoMotivo,
      ...(inf.substituicao.descricaoMotivo
        ? { xMotivo: inf.substituicao.descricaoMotivo }
        : {}),
    };
  }

  node.prest = buildPrestadorNode(inf.prestador);

  if (inf.tomador) {
    node.toma = buildTomadorNode(inf.tomador);
  }

  if (inf.intermediario) {
    node.interm = buildTomadorNode(inf.intermediario);
  }

  node.serv = buildServicoNode(inf.servico);
  node.valores = buildValoresNode(inf.valores);

  return node;
}

export function buildDpsXml(dps: Dps): string {
  const infDps = buildInfDpsNode(dps.infDps);

  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("DPS", {
    xmlns: NFSE_NAMESPACE,
    versao: dps.versao,
  });

  // Monta infDPS recursivamente
  const infNode = doc.ele("infDPS", { Id: dps.infDps.id });
  appendObject(infNode, infDps);

  return doc.end({ prettyPrint: false });
}

// xmlbuilder2 helper: aplica um objeto JS como elementos XML filhos
// Ignora chaves que começam com "@" (já usadas como atributos no pai)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function appendObject(parent: any, obj: Record<string, unknown>) {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@")) continue; // atributos já setados
    if (value === undefined || value === null) continue;

    if (typeof value === "string" || typeof value === "number") {
      parent.ele(key).txt(String(value));
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") {
          const child = parent.ele(key);
          appendObject(child, item as Record<string, unknown>);
        }
      }
    } else if (typeof value === "object") {
      const child = parent.ele(key);
      appendObject(child, value as Record<string, unknown>);
    }
  }
}
