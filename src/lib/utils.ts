import { clsx, type ClassValue } from "clsx";

/**
 * Combina classes condicionalmente.
 *
 * Observação: este projeto usa apenas `clsx` (sem `tailwind-merge`) para
 * manter as dependências enxutas. Se houver necessidade de resolver
 * conflitos de utilitárias do Tailwind (ex.: `p-2 p-4`), instale
 * `tailwind-merge` e passe o resultado de `clsx` por `twMerge`.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
