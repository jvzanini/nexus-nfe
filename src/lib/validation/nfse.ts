import { z } from "zod";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const stepClienteSchema = z.object({
  clienteMeiId: z.string().uuid("Selecione um cliente MEI"),
});

export const stepServicoSchema = z.object({
  codigoTributacaoNacional: z.string().trim().min(1, "Código de tributação é obrigatório"),
  descricaoServico: z.string().trim().min(5, "Descrição do serviço deve ter pelo menos 5 caracteres").max(2000, "Descrição do serviço excede 2000 caracteres"),
  codigoNbs: z.string().trim().optional().or(z.literal("")),
  localPrestacaoIbge: z.string().trim().transform(onlyDigits).refine((v) => v.length === 7, "Código IBGE do município deve ter 7 dígitos"),
});

export const stepTomadorSchema = z.object({
  tomadorTipo: z.enum(["cpf", "cnpj"], { required_error: "Selecione o tipo de documento" }),
  tomadorDocumento: z.string().trim().transform(onlyDigits).refine((v) => v.length === 11 || v.length === 14, "CPF (11) ou CNPJ (14) dígitos"),
  tomadorNome: z.string().trim().min(2, "Nome do tomador é obrigatório").max(200),
  tomadorEmail: z.string().trim().toLowerCase().email("E-mail inválido").optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  tomadorCep: z.string().trim().transform(onlyDigits).optional().or(z.literal("")),
  tomadorLogradouro: z.string().trim().max(200).optional().or(z.literal("")),
  tomadorNumero: z.string().trim().max(20).optional().or(z.literal("")),
  tomadorComplemento: z.string().trim().max(100).optional().or(z.literal("")),
  tomadorBairro: z.string().trim().max(100).optional().or(z.literal("")),
  tomadorMunicipioIbge: z.string().trim().optional().or(z.literal("")),
});

export const stepValoresSchema = z.object({
  valorServico: z.number({ required_error: "Valor do serviço é obrigatório" }).positive("Valor do serviço deve ser maior que zero").max(999999999.99, "Valor excede o máximo permitido"),
  aliquotaIss: z.number({ required_error: "Alíquota do ISS é obrigatória" }).min(0, "Alíquota não pode ser negativa").max(100, "Alíquota não pode exceder 100%"),
  tributacaoIssqn: z.number().int().min(1).max(7).default(1),
});

export const criarNfseSchema = stepClienteSchema.merge(stepServicoSchema).merge(stepTomadorSchema).merge(stepValoresSchema);

export type StepClienteInput = z.infer<typeof stepClienteSchema>;
export type StepServicoInput = z.infer<typeof stepServicoSchema>;
export type StepTomadorInput = z.infer<typeof stepTomadorSchema>;
export type StepValoresInput = z.infer<typeof stepValoresSchema>;
export type CriarNfseInput = z.infer<typeof criarNfseSchema>;
