// Logger estruturado para operações NFS-e.
// NUNCA loga: senha, PFX, certificado, CNPJ completo, chaves de criptografia.
// Loga: operação, idDps, status, timing, erros (sem stack trace sensível).

export interface NfseLogEntry {
  operation: string;
  nfseId?: string;
  idDps?: string;
  clienteMeiId?: string;
  status?: string;
  durationMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

function maskDoc(doc: string): string {
  if (!doc || doc.length < 6) return "***";
  return doc.slice(0, 3) + "***" + doc.slice(-3);
}

export function logNfse(entry: NfseLogEntry): void {
  const timestamp = new Date().toISOString();
  const level = entry.error ? "ERROR" : "INFO";

  // Sanitiza details para remover campos sensíveis
  const safeDetails = entry.details ? { ...entry.details } : undefined;
  if (safeDetails) {
    delete safeDetails.pfx;
    delete safeDetails.senha;
    delete safeDetails.password;
    delete safeDetails.privateKey;
    delete safeDetails.certPem;
    delete safeDetails.encryptionKey;
    // Mascara documentos
    if (typeof safeDetails.cnpj === "string") safeDetails.cnpj = maskDoc(safeDetails.cnpj);
    if (typeof safeDetails.cpf === "string") safeDetails.cpf = maskDoc(safeDetails.cpf);
  }

  const log = {
    timestamp,
    level,
    service: "nexus-nfe",
    ...entry,
    ...(safeDetails ? { details: safeDetails } : {}),
  };

  if (entry.error) {
    console.error(JSON.stringify(log));
  } else {
    console.log(JSON.stringify(log));
  }
}

/**
 * Wrapper para medir duração de uma operação.
 */
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  meta?: Partial<NfseLogEntry>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logNfse({
      operation,
      durationMs: Date.now() - start,
      ...meta,
    });
    return result;
  } catch (error) {
    logNfse({
      operation,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      ...meta,
    });
    throw error;
  }
}
