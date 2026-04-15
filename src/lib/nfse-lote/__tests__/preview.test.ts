import { describe, it, expect } from "vitest";
import { previewLoteCore, type PreviewContext } from "../preview";
import type { ServicoPadraoInput } from "@/lib/validation/nfse-lote";

const servico: ServicoPadraoInput = {
  codigoTributacaoNacional: "101010100",
  codigoNbs: undefined,
  localPrestacaoIbge: "5300108",
  aliquotaIss: 5,
  descricaoServico: "Consultoria técnica padrão",
  tributacaoIssqn: 1,
};

const ctxOk: PreviewContext = {
  empresaAtiva: true,
  certificadoValido: true,
  certificadoExpirado: false,
  faturamentoAtualReais: 0,
  limiteMeiReais: 81000,
  empresaEhMei: true,
  lotesSimultaneosAbertos: 0,
  maxLotesSimultaneos: 5,
  maxItens: 500,
};

function hoje(): string {
  const d = new Date();
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

describe("previewLoteCore", () => {
  it("processa CSV válido", () => {
    const csv = `documento;nome;email;valor_servico;descricao_servico;data_competencia
11144477735;João Silva;joao@ex.com;100,00;;${hoje()}
11222333000181;Empresa LTDA;;200,50;Serviço especial;${hoje()}`;
    const r = previewLoteCore(servico, csv, ctxOk);
    expect(r.validos).toHaveLength(2);
    expect(r.invalidos).toHaveLength(0);
    expect(r.duplicadosPlanilha).toBe(0);
    expect(r.totalValor).toBeCloseTo(300.5);
    expect(r.bloqueios).toHaveLength(0);
  });

  it("marca CPF inválido", () => {
    const csv = `documento;nome;valor_servico
12345678901;João;100`;
    const r = previewLoteCore(servico, csv, ctxOk);
    expect(r.invalidos).toHaveLength(1);
    expect(r.invalidos[0].motivo).toMatch(/CPF/);
  });

  it("marca duplicado na planilha", () => {
    const csv = `documento;nome;valor_servico
11144477735;João;100
11144477735;João novamente;200`;
    const r = previewLoteCore(servico, csv, ctxOk);
    expect(r.validos).toHaveLength(1);
    expect(r.duplicadosPlanilha).toBe(1);
  });

  it("bloqueia sem certificado", () => {
    const csv = `documento;nome;valor_servico
11144477735;João;100`;
    const r = previewLoteCore(servico, csv, {
      ...ctxOk,
      certificadoValido: false,
    });
    expect(r.bloqueios.some((b) => b.tipo === "sem_certificado")).toBe(true);
  });

  it("bloqueia limite MEI", () => {
    const csv = `documento;nome;valor_servico
11144477735;João;100`;
    const r = previewLoteCore(servico, csv, {
      ...ctxOk,
      faturamentoAtualReais: 80990,
    });
    expect(r.bloqueios.some((b) => b.tipo === "limite_mei")).toBe(true);
  });

  it("bloqueia excesso de itens", () => {
    function genCpf(seed: number): string {
      const digits: number[] = [];
      for (let i = 0; i < 9; i++) digits.push((seed + i * 7) % 10);
      const calc = (len: number) => {
        let s = 0;
        for (let i = 0; i < len; i++) s += digits[i] * (len + 1 - i);
        const r = (s * 10) % 11;
        return r === 10 ? 0 : r;
      };
      digits.push(calc(9));
      digits.push(calc(10));
      return digits.join("");
    }
    const cpfs = [genCpf(1), genCpf(23), genCpf(57)];
    const linhas = cpfs.map((cpf, i) => `${cpf};Pessoa ${i};100`);
    const csv = `documento;nome;valor_servico\n${linhas.join("\n")}`;
    const r = previewLoteCore(servico, csv, { ...ctxOk, maxItens: 2 });
    expect(r.validos).toHaveLength(3);
    expect(r.bloqueios.some((b) => b.tipo === "limite_itens")).toBe(true);
  });

  it("rejeita CSV sem header obrigatório", () => {
    const csv = `doc;nome;valor\n11144477735;João;100`;
    const r = previewLoteCore(servico, csv, ctxOk);
    expect(r.bloqueios.some((b) => b.mensagem.match(/valor_servico/))).toBe(
      true
    );
  });
});
