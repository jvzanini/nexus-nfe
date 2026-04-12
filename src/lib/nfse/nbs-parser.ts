import XLSX from "xlsx";
import path from "node:path";

export interface NbsRecord {
  codigo: string;
  descricao: string;
  nivel: number;
  parentCodigo: string | null;
  aliquotaMin: number | null;
  aliquotaMax: number | null;
}

const SPREADSHEET_PATH = path.resolve(
  __dirname,
  "../../../docs/nfse/reference/anexo-b-nbs.xlsx",
);

const SHEET_NAME = "LISTA.SERV.NAC.";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function padCode6(n: number): string {
  return String(n).padStart(6, "0");
}

/**
 * Lê a planilha oficial de NBS (LC 116/2003) e retorna os registros parseados.
 * Aceita caminho opcional para facilitar testes.
 */
export function parseNbsSheet(filePath?: string): NbsRecord[] {
  const wb = XLSX.readFile(filePath ?? SPREADSHEET_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    throw new Error(`Sheet "${SHEET_NAME}" não encontrada na planilha`);
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const records: NbsRecord[] = [];

  // Pula header (row 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const [rawCodigo, rawItem, rawSubitem, rawDesdobro, rawDescricao] = row;

    const item = Number(rawItem);
    const subitem = Number(rawSubitem);
    const desdobro = Number(rawDesdobro);
    const descricao = String(rawDescricao ?? "").trim();

    if (!descricao || isNaN(item)) continue;

    let codigo: string;
    let nivel: number;
    let parentCodigo: string | null;

    if (desdobro > 0) {
      // Emitível — nível 2
      codigo = padCode6(Number(rawCodigo));
      nivel = 2;
      parentCodigo = pad2(item) + pad2(subitem) + "00";
    } else if (subitem > 0) {
      // Header de subitem — nível 1
      codigo = pad2(item) + pad2(subitem) + "00";
      nivel = 1;
      parentCodigo = pad2(item) + "0000";
    } else {
      // Header de item — nível 1
      codigo = pad2(item) + "0000";
      nivel = 1;
      parentCodigo = null;
    }

    records.push({
      codigo,
      descricao,
      nivel,
      parentCodigo,
      aliquotaMin: null,
      aliquotaMax: null,
    });
  }

  return records;
}
