// Geração e validação do identificador de DPS conforme manual oficial.
// Formato (45 chars): "DPS" + cLocEmi(7) + tpInsc(1) + inscFed(14) + serie(5) + nDPS(15)
// Ver: docs/nfse/reference/dps-schema-notes.md

import type { IdDpsInput } from "./types";

/**
 * Gera o Id do DPS. Sempre 45 caracteres.
 *
 * Campos:
 * - cLocEmi: código IBGE do município emissor (7 dígitos)
 * - tpInsc: 1 = CNPJ, 2 = CPF
 * - inscFed: inscrição federal preenchida com zeros à esquerda até 14 dígitos
 * - serie: série do DPS (até 5 dígitos, padded com 0)
 * - nDPS: número do DPS (até 15 dígitos, padded com 0)
 */
export function buildIdDps(input: IdDpsInput): string {
  if (!/^\d{7}$/.test(input.codigoLocalEmissao)) {
    throw new Error("codigoLocalEmissao deve ter 7 dígitos");
  }
  if (input.tipoInscricao !== 1 && input.tipoInscricao !== 2) {
    throw new Error("tipoInscricao deve ser 1 (CNPJ) ou 2 (CPF)");
  }
  if (!/^\d+$/.test(input.inscricaoFederal)) {
    throw new Error("inscricaoFederal deve conter apenas dígitos");
  }
  if (input.inscricaoFederal.length > 14) {
    throw new Error("inscricaoFederal excede 14 dígitos");
  }
  if (!/^\d+$/.test(input.serie)) {
    throw new Error("serie deve conter apenas dígitos");
  }
  if (input.serie.length > 5) {
    throw new Error("série excede 5 dígitos");
  }
  if (!/^\d+$/.test(input.numero)) {
    throw new Error("numero deve conter apenas dígitos");
  }
  if (input.numero.length > 15) {
    throw new Error("numero excede 15 dígitos");
  }

  const inscFed = input.inscricaoFederal.padStart(14, "0");
  const serie = input.serie.padStart(5, "0");
  const numero = input.numero.padStart(15, "0");

  const id =
    "DPS" +
    input.codigoLocalEmissao +
    String(input.tipoInscricao) +
    inscFed +
    serie +
    numero;

  if (id.length !== 45) {
    throw new Error(`idDps gerado com ${id.length} chars, esperado 45`);
  }
  return id;
}

const ID_DPS_REGEX = /^DPS\d{7}[12]\d{14}\d{5}\d{15}$/;

export function validateIdDps(idDps: string): boolean {
  return ID_DPS_REGEX.test(idDps);
}
