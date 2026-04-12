export interface SubmitSuccessResponse {
  success: true;
  chaveAcesso: string;
  numeroNfse: string;
  dataAutorizacao: string;
  xmlAutorizado?: string;
}

export interface SubmitErrorResponse {
  success: false;
  codigo: string;
  mensagem: string;
}

export type SubmitResponse = SubmitSuccessResponse | SubmitErrorResponse;

export function parseSubmitResponse(raw: Record<string, unknown>): SubmitResponse {
  if (raw.chaveAcesso && raw.numeroNfse) {
    return {
      success: true,
      chaveAcesso: String(raw.chaveAcesso),
      numeroNfse: String(raw.numeroNfse),
      dataAutorizacao: String(raw.dataAutorizacao ?? ""),
      xmlAutorizado: raw.xmlAutorizado ? String(raw.xmlAutorizado) : undefined,
    };
  }
  return parseErrorResponse(raw);
}

export function parseErrorResponse(raw: Record<string, unknown>): SubmitErrorResponse {
  return {
    success: false,
    codigo: raw.codigo ? String(raw.codigo) : "UNKNOWN",
    mensagem: raw.mensagem ? String(raw.mensagem) : "Erro desconhecido na API do SEFIN",
  };
}
