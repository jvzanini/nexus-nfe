// Tipos TypeScript alinhados ao schema oficial DPS_v1.01.xsd
// Fonte: docs/nfse/reference/schemas/Schemas/1.01/
// Ver: docs/nfse/reference/dps-schema-notes.md

export const NFSE_NAMESPACE = "http://www.sped.fazenda.gov.br/nfse";
export const NFSE_VERSAO = "1.00";

/** 1 = Produção, 2 = Homologação (produção restrita) */
export type TipoAmbiente = 1 | 2;

/** 1 = Prestador, 2 = Tomador, 3 = Intermediário */
export type TipoEmitente = 1 | 2 | 3;

/** Situação no Simples Nacional: 1=Não, 2=MEI, 3=ME/EPP */
export type OpcaoSimplesNacional = 1 | 2 | 3;

/**
 * Regime Especial de Tributação:
 * 0=Nenhum, 1=Ato Cooperado, 2=Estimativa, 3=Microempresa Municipal,
 * 4=Notário/Registrador, 5=Profissional Autônomo, 6=Sociedade de Profissionais,
 * 9=Outros
 */
export type RegimeEspecialTributacao = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 9;

/** Justificativa de substituição (apenas 01-05, 99) */
export type CodigoJustificativaSubstituicao = "01" | "02" | "03" | "04" | "05" | "99";

// --- Endereços ---

export interface EnderecoNacional {
  tipo: "nacional";
  cep: string; // 8 dígitos
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  /** Código IBGE do município (7 dígitos) */
  municipioIbge: string;
}

export interface EnderecoExterior {
  tipo: "exterior";
  /** ISO-3166 numérico */
  codigoPaisIso: string;
  codigoEnderecamentoPostal: string;
  cidade: string;
  estadoProvinciaRegiao: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
}

export type Endereco = EnderecoNacional | EnderecoExterior;

// --- Regime tributário ---

export interface RegimeTributario {
  opcaoSimplesNacional: OpcaoSimplesNacional;
  regimeEspecialTributacao: RegimeEspecialTributacao;
}

// --- Pessoas envolvidas ---

export type TipoDocumento = "cnpj" | "cpf" | "nif";

interface PessoaBase {
  tipoDocumento: TipoDocumento;
  documento: string;
  inscricaoMunicipal?: string;
  nome: string;
  endereco?: Endereco;
  telefone?: string;
  email?: string;
}

export interface Prestador extends PessoaBase {
  regimeTributario: RegimeTributario;
}

export type Tomador = PessoaBase;
export type Intermediario = PessoaBase;

// --- Serviço ---

export interface LocalPrestacao {
  /** Código IBGE do município onde o serviço é prestado (7 dígitos) */
  municipioIbge: string;
}

export interface CodigoServico {
  /** Código de tributação nacional (LC 116/2003). Obrigatório. */
  codigoTributacaoNacional: string;
  /** Código de tributação municipal (opcional). */
  codigoTributacaoMunicipal?: string;
  /** Código NBS (opcional pra MEI). */
  codigoNbs?: string;
  /** Descrição do serviço. */
  descricao: string;
}

export interface Servico {
  localPrestacao: LocalPrestacao;
  codigoServico: CodigoServico;
}

// --- Valores ---

export interface Valores {
  /** Valor do serviço prestado (reais, 2 decimais). */
  valorServico: number;
  /** Alíquota do ISS em % (ex: 2.0 pra 2%). */
  aliquotaIss: number;
  /**
   * Tributação: 1=ISSQN exigível, 2=ISSQN não incidência, 3=isenção,
   * 4=exportação, 5=imunidade, 6=exigibilidade suspensa decisão judicial,
   * 7=exigibilidade suspensa decisão administrativa
   */
  tributacaoIssqn: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Valor do ISS retido (se houver). 0 se sem retenção. */
  valorIssRetido?: number;
  /** Valor total de deduções (se houver). 0 se sem deduções. */
  valorDeducoes?: number;
  /** Valor líquido da nota (calculado: valorServico - deduções - retenções). */
  valorLiquido?: number;
}

// --- Substituição ---

export interface Substituicao {
  /** Chave de acesso da NFS-e que está sendo substituída. */
  chaveSubstituida: string;
  codigoMotivo: CodigoJustificativaSubstituicao;
  descricaoMotivo?: string;
}

// --- DPS ---

export interface InfDps {
  /** Id do DPS (44 caracteres). Usado como atributo do elemento infDPS. */
  id: string;
  tipoAmbiente: TipoAmbiente;
  /** Data e hora de emissão da DPS (UTC). */
  dataHoraEmissao: Date;
  /** Versão do aplicativo emissor. */
  versaoAplicativo: string;
  /** Série do DPS (1-5 dígitos). */
  serie: string;
  /** Número do DPS (1-15 dígitos). */
  numero: string;
  /** Data de início da prestação do serviço (só data). */
  dataCompetencia: Date;
  tipoEmitente: TipoEmitente;
  /** Código IBGE do município emissor (7 dígitos). */
  codigoLocalEmissao: string;
  substituicao?: Substituicao;
  prestador: Prestador;
  tomador?: Tomador;
  intermediario?: Intermediario;
  servico: Servico;
  valores: Valores;
}

export interface Dps {
  versao: string; // ex: "1.00"
  infDps: InfDps;
}

// --- Identificação pra idDps ---

export interface IdDpsInput {
  /** Código IBGE do município emissor (7 dígitos). */
  codigoLocalEmissao: string;
  /** 1 pra CNPJ, 2 pra CPF. */
  tipoInscricao: 1 | 2;
  /** CNPJ (14) ou CPF (11) já com zeros à esquerda. */
  inscricaoFederal: string;
  /** Série do DPS. */
  serie: string;
  /** Número sequencial do DPS. */
  numero: string;
}
