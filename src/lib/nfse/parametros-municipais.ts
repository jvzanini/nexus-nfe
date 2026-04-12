export interface ConvenioMunicipal {
  codigoMunicipio: string;
  nomeMunicipio: string;
  uf: string;
  aderiu: boolean;
  dataAdesao: string | null;
  regimeEspecial: boolean;
}

export interface ParametrosServico {
  codigoMunicipio: string;
  codigoServico: string;
  aliquota: number;
  beneficioFiscal: boolean;
  descricaoBeneficio: string | null;
}

const MOCK_CONVENIOS: Record<string, ConvenioMunicipal> = {
  "5300108": {
    codigoMunicipio: "5300108",
    nomeMunicipio: "Brasília",
    uf: "DF",
    aderiu: true,
    dataAdesao: "2023-09-01",
    regimeEspecial: false,
  },
};

const MOCK_ALIQUOTA_PADRAO = 5.0;
const MOCK_ALIQUOTA_TI = 2.0;

function getMockAliquota(cServ: string): number | null {
  if (cServ.startsWith("01")) return MOCK_ALIQUOTA_TI;
  if (/^\d{6}$/.test(cServ)) return MOCK_ALIQUOTA_PADRAO;
  return null;
}

/**
 * Consulta se o município aderiu ao convênio NFS-e nacional.
 * Fase 1B: mock. Fase 3: GET real com cache Redis TTL 24h.
 */
export async function getConvenioMunicipal(
  codigoMunicipio: string
): Promise<ConvenioMunicipal | null> {
  return MOCK_CONVENIOS[codigoMunicipio] ?? null;
}

/**
 * Consulta parâmetros de serviço (alíquota, benefícios) para um município.
 * Fase 1B: mock. Fase 3: GET real com cache Redis TTL 24h.
 */
export async function getParametrosServico(
  codigoMunicipio: string,
  codigoServico: string
): Promise<ParametrosServico | null> {
  const convenio = MOCK_CONVENIOS[codigoMunicipio];
  if (!convenio) return null;

  const aliquota = getMockAliquota(codigoServico);
  if (aliquota === null) return null;

  return {
    codigoMunicipio,
    codigoServico,
    aliquota,
    beneficioFiscal: false,
    descricaoBeneficio: null,
  };
}
