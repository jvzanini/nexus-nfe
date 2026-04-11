// Empacotamento do XML assinado: GZip + Base64.
// Usado pra construir o body JSON `{"dpsXmlGZipB64": "..."}` aceito pelo
// endpoint POST /nfse do Emissor Nacional.

import zlib from "node:zlib";

/**
 * Comprime o XML em GZip e codifica em Base64.
 * Retorna a string pronta pra colocar no body JSON.
 */
export function packDps(xml: string): string {
  const utf8 = Buffer.from(xml, "utf-8");
  const gzipped = zlib.gzipSync(utf8);
  return gzipped.toString("base64");
}

/**
 * Decodifica Base64 + descomprime GZip, retornando o XML original.
 * Usado em testes de round-trip e pra parsear respostas empacotadas da API.
 */
export function unpackDps(base64Gzipped: string): string {
  const gzipped = Buffer.from(base64Gzipped, "base64");
  const xml = zlib.gunzipSync(gzipped).toString("utf-8");
  return xml;
}
