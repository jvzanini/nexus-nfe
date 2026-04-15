import { z } from "zod";

const onlyDigitsStr = (v: string) => v.replace(/\D/g, "");

export const servicoPadraoSchema = z.object({
  codigoTributacaoNacional: z
    .string()
    .trim()
    .min(1, "Código de tributação é obrigatório"),
  codigoNbs: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  localPrestacaoIbge: z
    .string()
    .trim()
    .transform(onlyDigitsStr)
    .refine((v) => v.length === 7, "IBGE precisa de 7 dígitos"),
  aliquotaIss: z
    .number({ required_error: "Alíquota do ISS é obrigatória" })
    .min(0, "Alíquota não pode ser negativa")
    .max(100, "Alíquota não pode exceder 100%"),
  descricaoServico: z
    .string()
    .trim()
    .min(5, "Descrição padrão deve ter pelo menos 5 caracteres")
    .max(2000, "Descrição padrão excede 2000 caracteres"),
  tributacaoIssqn: z.number().int().min(1).max(7).default(1),
});

export type ServicoPadraoInput = z.infer<typeof servicoPadraoSchema>;
