import https from "node:https";

/**
 * Cria um https.Agent configurado para mTLS com o certificado do prestador.
 */
export function createMtlsAgent(
  privateKeyPem: string,
  certPem: string
): https.Agent {
  return new https.Agent({
    key: privateKeyPem,
    cert: certPem,
    rejectUnauthorized: true,
  });
}
