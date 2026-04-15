export type Frequencia =
  | "unica"
  | "mensal"
  | "bimestral"
  | "trimestral"
  | "semestral"
  | "anual";

const INCREMENTOS_MESES: Record<Exclude<Frequencia, "unica">, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

/**
 * Calcula a próxima execução com base em uma execução anterior e frequência.
 * Para frequências recorrentes, ajusta o dia do mês conforme `diaMes` (ou do
 * base), respeitando o último dia do mês quando o dia desejado não existe
 * (ex: 31/01 → 28/02 ou 29/02 em ano bissexto).
 *
 * Retorna null para `unica` (não há próxima).
 */
export function calcularProximaExecucao(
  base: Date,
  frequencia: Frequencia,
  diaMes?: number | null
): Date | null {
  if (frequencia === "unica") return null;

  const inc = INCREMENTOS_MESES[frequencia];
  const diaAlvo = diaMes && diaMes > 0 ? diaMes : base.getUTCDate();

  const ano = base.getUTCFullYear();
  const mes = base.getUTCMonth();
  const novoMes = mes + inc;
  const novoAno = ano + Math.floor(novoMes / 12);
  const mesNormalizado = ((novoMes % 12) + 12) % 12;

  const ultimoDiaDoMes = new Date(
    Date.UTC(novoAno, mesNormalizado + 1, 0)
  ).getUTCDate();
  const diaFinal = Math.min(diaAlvo, ultimoDiaDoMes);

  return new Date(
    Date.UTC(
      novoAno,
      mesNormalizado,
      diaFinal,
      base.getUTCHours(),
      base.getUTCMinutes(),
      0,
      0
    )
  );
}

/**
 * Verifica se o agendamento deve encerrar com base nos limites.
 * Retorna `true` se deve encerrar.
 */
export function deveEncerrar(
  proximaExecucao: Date | null,
  dataFinal: Date | null,
  totalExecucoes: number,
  maxExecucoes: number | null
): boolean {
  if (!proximaExecucao) return true;
  if (dataFinal && proximaExecucao > dataFinal) return true;
  if (maxExecucoes && totalExecucoes >= maxExecucoes) return true;
  return false;
}
