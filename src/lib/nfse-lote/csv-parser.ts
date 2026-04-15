export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function isValidCpf(cpf: string): boolean {
  const c = onlyDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function isValidCnpj(cnpj: string): boolean {
  const c = onlyDigits(cnpj);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(c[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export function detectSeparator(firstLine: string): ";" | "," {
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  return semi >= comma ? ";" : ",";
}

export function parseCsvLine(line: string, sep: "," | ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === sep) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

/**
 * Parse valor numérico no formato BR ou EN.
 * Aceita: "100", "100,50", "100.50", "1.234,56", "1,234.56".
 * Se houver vírgula + ponto, o último separador é o decimal.
 */
export function parseValorBr(s: string): number | null {
  if (!s) return null;
  const raw = s.trim();
  if (!raw) return null;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized: string;
  if (hasComma && hasDot) {
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = raw;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse data BR (DD/MM/YYYY) ou ISO (YYYY-MM-DD).
 * Retorna Date em UTC midnight ou null.
 */
export function parseDataBr(s: string): Date | null {
  if (!s) return null;
  const raw = s.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  let y: number, m: number, d: number;
  const mBr = raw.match(br);
  const mIso = raw.match(iso);
  if (mBr) {
    d = Number(mBr[1]);
    m = Number(mBr[2]);
    y = Number(mBr[3]);
  } else if (mIso) {
    y = Number(mIso[1]);
    m = Number(mIso[2]);
    d = Number(mIso[3]);
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

/** Remove BOM, divide em linhas não vazias. */
export function splitCsvLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
}
