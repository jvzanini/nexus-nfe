// URLs e constantes oficiais do gov.br/nfse
// Ver: docs/nfse/reference/dps-schema-notes.md

export const NFSE_ENDPOINTS = {
  homologacao: {
    sefinBase: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional",
    adnBase: "https://adn.producaorestrita.nfse.gov.br/contribuintes",
  },
  producao: {
    sefinBase: "https://sefin.nfse.gov.br/SefinNacional",
    adnBase: "https://adn.nfse.gov.br/contribuintes",
  },
} as const;

export const NFSE_ROTAS = {
  emissao: "/nfse", // POST — body { dpsXmlGZipB64: string }
  consultarNfsePorChave: (chave: string) => `/nfse/${chave}`, // GET
  consultarDps: (idDps: string) => `/dps/${idDps}`, // GET
  reconciliarDps: (idDps: string) => `/dps/${idDps}`, // HEAD
  eventos: (chave: string) => `/nfse/${chave}/eventos`, // POST | GET
  parametrosMunicipaisConvenio: (cMun: string) =>
    `/parametros_municipais/${cMun}/convenio`,
  parametrosMunicipaisServico: (cMun: string, cServ: string) =>
    `/parametros_municipais/${cMun}/${cServ}`,
  parametrosMunicipaisContribuinte: (cMun: string, doc: string) =>
    `/parametros_municipais/${cMun}/${doc}`,
} as const;

/** Município único do Distrito Federal — Brasília. */
export const MUNICIPIO_IBGE_DF = "5300108";

/** Limite anual de faturamento do MEI em 2026. */
export const LIMITE_MEI_ANUAL_2026 = 81000;

/** Tolerância de excesso antes de desenquadramento retroativo (20%). */
export const LIMITE_MEI_TOLERANCIA_PERC = 0.2;
