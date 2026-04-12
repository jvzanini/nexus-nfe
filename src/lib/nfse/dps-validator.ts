import type { Dps } from "./types";

interface ValidationResult {
  success: boolean;
  error?: string;
  errors?: string[];
}

export function validateDps(dps: Dps): ValidationResult {
  const errors: string[] = [];
  const inf = dps.infDps;

  if (!inf.id || inf.id.length !== 45) errors.push("Id do DPS deve ter 45 caracteres");
  if (!/^\d{7}$/.test(inf.codigoLocalEmissao)) errors.push("Código do município emissor deve ter 7 dígitos");
  if (!inf.serie) errors.push("Série do DPS é obrigatória");
  if (!inf.numero) errors.push("Número do DPS é obrigatório");

  if (!inf.prestador.documento) errors.push("Documento do prestador é obrigatório");

  if (inf.tomador) {
    if (!inf.tomador.nome || inf.tomador.nome.trim() === "") errors.push("Nome do tomador é obrigatório quando tomador está presente");
    if (!inf.tomador.documento) errors.push("Documento do tomador é obrigatório");
  }

  const serv = inf.servico;
  if (!serv.codigoServico.codigoTributacaoNacional) errors.push("Código de tributação nacional é obrigatório");
  if (!serv.codigoServico.descricao || serv.codigoServico.descricao.trim() === "") errors.push("Descrição do serviço é obrigatória");
  if (!/^\d{7}$/.test(serv.localPrestacao.municipioIbge)) errors.push("Código IBGE do local de prestação deve ter 7 dígitos");

  const val = inf.valores;
  if (val.valorServico <= 0) errors.push("Valor do serviço deve ser maior que zero");
  if (val.aliquotaIss < 0 || val.aliquotaIss > 100) errors.push("Alíquota do ISS deve estar entre 0% e 100%");
  if (val.valorIssRetido !== undefined && val.valorIssRetido < 0) errors.push("Valor de ISS retido não pode ser negativo");
  if (val.valorIssRetido !== undefined && val.valorIssRetido > val.valorServico) errors.push("Valor de ISS retido não pode ser maior que o valor do serviço");
  if (val.valorDeducoes !== undefined && val.valorDeducoes < 0) errors.push("Valor de deduções não pode ser negativo");

  if (errors.length > 0) return { success: false, error: errors[0], errors };
  return { success: true };
}
