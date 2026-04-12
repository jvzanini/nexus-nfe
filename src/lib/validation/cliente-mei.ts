import { z } from "zod";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function isValidCnpj(cnpj: string): boolean {
  const c = onlyDigits(cnpj);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;

  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(c.charAt(len - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  const d1 = calc(12);
  if (d1 !== Number(c.charAt(12))) return false;
  const d2 = calc(13);
  return d2 === Number(c.charAt(13));
}

export const cnpjSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos")
  .refine(isValidCnpj, "CNPJ inválido");

export const cepSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((v) => v.length === 8, "CEP deve ter 8 dígitos");

export const ufSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(2, "UF deve ter 2 caracteres");

export const municipioIbgeSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((v) => v.length === 7, "Código IBGE do município deve ter 7 dígitos");

export const serieDpsSchema = z
  .string()
  .trim()
  .regex(/^\d{1,5}$/, "Série deve ter até 5 dígitos numéricos")
  .transform((v) => v.padStart(5, "0"));

export const createClienteMeiSchema = z.object({
  cnpj: cnpjSchema,
  razaoSocial: z.string().trim().min(2, "Razão social obrigatória").max(200),
  nomeFantasia: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  inscricaoMunicipal: z.string().trim().max(30).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  email: z.string().trim().toLowerCase().email("E-mail inválido").optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  telefone: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  cep: cepSchema,
  logradouro: z.string().trim().min(2, "Logradouro obrigatório").max(200),
  numero: z.string().trim().min(1, "Número obrigatório").max(20),
  complemento: z.string().trim().max(100).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  bairro: z.string().trim().min(2, "Bairro obrigatório").max(100),
  municipioIbge: municipioIbgeSchema,
  uf: ufSchema,
  codigoServicoPadrao: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  serieDpsAtual: serieDpsSchema.default("00001"),
});

export const updateClienteMeiSchema = createClienteMeiSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateClienteMeiInput = z.infer<typeof createClienteMeiSchema>;
export type UpdateClienteMeiInput = z.infer<typeof updateClienteMeiSchema>;
