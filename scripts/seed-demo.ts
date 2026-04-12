// Seed de dados simulados para demonstração.
// Rodar: npx tsx scripts/seed-demo.ts

import { PrismaClient } from "../src/generated/prisma/client";
import { encrypt } from "../src/lib/encryption";

const prisma = new PrismaClient();

const USER_ID = "f9a13dea-786b-44af-9ab7-ac89eb382ad2"; // admin@nexusai360.com

// Dados fake de clientes MEI
const CLIENTES = [
  {
    cnpj: "45678901000123",
    razaoSocial: "Tech Solutions MEI",
    nomeFantasia: "Tech Solutions",
    email: "contato@techsolutions.com.br",
    telefone: "61999001122",
    cep: "70070010",
    logradouro: "SBS Quadra 2 Bloco E",
    numero: "500",
    complemento: "Sala 1201",
    bairro: "Asa Sul",
    municipioIbge: "5300108",
    uf: "DF",
    codigoServicoPadrao: "010101",
  },
  {
    cnpj: "12345678000199",
    razaoSocial: "Maria Design Digital MEI",
    nomeFantasia: "Maria Design",
    email: "maria@mariadesign.com.br",
    telefone: "61988776655",
    cep: "70297400",
    logradouro: "SQN 310 Bloco K",
    numero: "201",
    bairro: "Asa Norte",
    municipioIbge: "5300108",
    uf: "DF",
    codigoServicoPadrao: "070801",
  },
  {
    cnpj: "98765432000188",
    razaoSocial: "Carlos Consultoria Empresarial MEI",
    nomeFantasia: "Carlos Consultoria",
    email: "carlos@consultoria.com.br",
    telefone: "11977665544",
    cep: "01310100",
    logradouro: "Av Paulista",
    numero: "1000",
    complemento: "Conj 42",
    bairro: "Bela Vista",
    municipioIbge: "3550308",
    uf: "SP",
    codigoServicoPadrao: "170201",
  },
];

// Dados fake de NFS-e com vários status
const NFSES_TEMPLATE = [
  {
    clienteIdx: 0,
    status: "autorizada",
    descricao: "Desenvolvimento de sistema web para gestão de estoque",
    codigo: "010101",
    valor: 4500.0,
    aliquota: 2.0,
    tomadorNome: "Supermercados Brasília LTDA",
    tomadorDoc: "11222333000144",
    tomadorTipo: "cnpj",
    chaveAcesso: "NFSe53001084567890100012300001000000000000000001",
    numeroNfse: "000000001",
    daysAgo: 30,
  },
  {
    clienteIdx: 0,
    status: "autorizada",
    descricao: "Manutenção mensal do sistema de gestão — março/2026",
    codigo: "010201",
    valor: 2800.0,
    aliquota: 2.0,
    tomadorNome: "Supermercados Brasília LTDA",
    tomadorDoc: "11222333000144",
    tomadorTipo: "cnpj",
    chaveAcesso: "NFSe53001084567890100012300001000000000000000002",
    numeroNfse: "000000002",
    daysAgo: 15,
  },
  {
    clienteIdx: 0,
    status: "autorizada",
    descricao: "Consultoria em segurança da informação",
    codigo: "010101",
    valor: 6000.0,
    aliquota: 2.0,
    tomadorNome: "João Pedro Almeida",
    tomadorDoc: "12345678909",
    tomadorTipo: "cpf",
    chaveAcesso: "NFSe53001084567890100012300001000000000000000003",
    numeroNfse: "000000003",
    daysAgo: 7,
  },
  {
    clienteIdx: 0,
    status: "rascunho",
    descricao: "Desenvolvimento de aplicativo mobile",
    codigo: "010101",
    valor: 8500.0,
    aliquota: 2.0,
    tomadorNome: "Startup Inovação LTDA",
    tomadorDoc: "55667788000199",
    tomadorTipo: "cnpj",
    daysAgo: 0,
  },
  {
    clienteIdx: 1,
    status: "autorizada",
    descricao: "Criação de identidade visual completa",
    codigo: "070801",
    valor: 3200.0,
    aliquota: 5.0,
    tomadorNome: "Restaurante Sabor & Arte LTDA",
    tomadorDoc: "99887766000155",
    tomadorTipo: "cnpj",
    chaveAcesso: "NFSe53001081234567800019900001000000000000000001",
    numeroNfse: "000000001",
    daysAgo: 20,
  },
  {
    clienteIdx: 1,
    status: "autorizada",
    descricao: "Design de material gráfico — cardápio digital",
    codigo: "070801",
    valor: 1800.0,
    aliquota: 5.0,
    tomadorNome: "Restaurante Sabor & Arte LTDA",
    tomadorDoc: "99887766000155",
    tomadorTipo: "cnpj",
    chaveAcesso: "NFSe53001081234567800019900001000000000000000002",
    numeroNfse: "000000002",
    daysAgo: 5,
  },
  {
    clienteIdx: 1,
    status: "rejeitada",
    descricao: "Redesign do site institucional",
    codigo: "070801",
    valor: 5500.0,
    aliquota: 5.0,
    tomadorNome: "Ana Paula Ferreira",
    tomadorDoc: "98765432100",
    tomadorTipo: "cpf",
    daysAgo: 2,
    codigoResposta: "422",
    mensagemResposta: "Código de serviço incompatível com o município do prestador",
  },
  {
    clienteIdx: 2,
    status: "autorizada",
    descricao: "Consultoria em planejamento estratégico — Q1/2026",
    codigo: "170201",
    valor: 12000.0,
    aliquota: 5.0,
    tomadorNome: "Indústria Nacional de Alimentos S.A.",
    tomadorDoc: "33445566000177",
    tomadorTipo: "cnpj",
    chaveAcesso: "NFSe35503089876543200018800001000000000000000001",
    numeroNfse: "000000001",
    daysAgo: 25,
  },
  {
    clienteIdx: 2,
    status: "cancelada",
    descricao: "Análise de viabilidade de projeto — cancelada a pedido do cliente",
    codigo: "170201",
    valor: 7500.0,
    aliquota: 5.0,
    tomadorNome: "Construtora Horizonte LTDA",
    tomadorDoc: "22334455000166",
    tomadorTipo: "cnpj",
    daysAgo: 10,
    mensagemResposta: "Cancelada: cliente desistiu do projeto antes do início",
  },
  {
    clienteIdx: 2,
    status: "pendente",
    descricao: "Consultoria em gestão de processos — abril/2026",
    codigo: "170201",
    valor: 9800.0,
    aliquota: 5.0,
    tomadorNome: "Indústria Nacional de Alimentos S.A.",
    tomadorDoc: "33445566000177",
    tomadorTipo: "cnpj",
    daysAgo: 0,
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function buildIdDps(municipio: string, cnpj: string, serie: string, numero: number): string {
  return "DPS" + municipio + "1" + cnpj.padStart(14, "0") + serie.padStart(5, "0") + String(numero).padStart(15, "0");
}

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.nfse.deleteMany();
  await prisma.faturamentoAnual.deleteMany();
  await prisma.servicoMemorizado.deleteMany();
  await prisma.tomadorFavorito.deleteMany();
  await prisma.certificadoDigital.deleteMany();
  await prisma.clienteMei.deleteMany();

  console.log("Criando clientes MEI...");
  const clienteIds: string[] = [];

  for (const c of CLIENTES) {
    const created = await prisma.clienteMei.create({
      data: { ...c, createdById: USER_ID },
      select: { id: true },
    });
    clienteIds.push(created.id);
  }

  console.log(`  ${clienteIds.length} clientes criados`);

  // Certificado fake para o primeiro cliente (para demonstrar status)
  console.log("Criando certificado digital fake...");
  const fakePfx = Buffer.from("fake-pfx-content-for-demo").toString("base64");
  await prisma.certificadoDigital.create({
    data: {
      clienteMeiId: clienteIds[0],
      nomeArquivo: "certificado-tech-solutions.pfx",
      pfxEncrypted: encrypt(fakePfx),
      senhaEncrypted: encrypt("senha123"),
      commonName: "TECH SOLUTIONS MEI:45678901000123",
      thumbprint: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      notBefore: new Date("2025-01-01"),
      notAfter: new Date("2027-01-01"),
    },
  });

  // Certificado expirado para o segundo cliente
  await prisma.certificadoDigital.create({
    data: {
      clienteMeiId: clienteIds[1],
      nomeArquivo: "certificado-maria-design.pfx",
      pfxEncrypted: encrypt(fakePfx),
      senhaEncrypted: encrypt("senha456"),
      commonName: "MARIA DESIGN DIGITAL MEI:12345678000199",
      thumbprint: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
      notBefore: new Date("2024-01-01"),
      notAfter: new Date("2026-05-15"),
    },
  });

  console.log("Criando NFS-e simuladas...");
  let nfseCount = 0;
  const clienteNumeros: Record<number, number> = { 0: 0, 1: 0, 2: 0 };

  for (const nf of NFSES_TEMPLATE) {
    const clienteId = clienteIds[nf.clienteIdx];
    const cliente = CLIENTES[nf.clienteIdx];
    clienteNumeros[nf.clienteIdx]++;
    const numero = clienteNumeros[nf.clienteIdx];
    const idDps = buildIdDps(cliente.municipioIbge, cliente.cnpj, "00001", numero);
    const dataEmissao = daysAgo(nf.daysAgo);

    await prisma.nfse.create({
      data: {
        clienteMeiId: clienteId,
        ambiente: "producao_restrita",
        status: nf.status as any,
        idDps,
        serie: "00001",
        numero: String(numero),
        dataEmissao,
        dataCompetencia: dataEmissao,
        descricaoServico: nf.descricao,
        codigoServico: nf.codigo,
        localPrestacaoIbge: cliente.municipioIbge,
        valorServico: nf.valor,
        aliquotaIss: nf.aliquota,
        valorIss: (nf.valor * nf.aliquota) / 100,
        tomadorTipo: nf.tomadorTipo,
        tomadorDocumento: nf.tomadorDoc,
        tomadorNome: nf.tomadorNome,
        chaveAcesso: nf.chaveAcesso ?? null,
        numeroNfse: nf.numeroNfse ?? null,
        dataAutorizacao: nf.chaveAcesso ? dataEmissao : null,
        codigoResposta: nf.codigoResposta ?? (nf.chaveAcesso ? "200" : null),
        mensagemResposta: nf.mensagemResposta ?? (nf.chaveAcesso ? "Autorizada" : null),
        xmlAssinado: nf.chaveAcesso ? '<?xml version="1.0" encoding="UTF-8"?><DPS xmlns="http://www.sped.fazenda.gov.br/nfse"><infDPS><!-- XML simulado --></infDPS></DPS>' : null,
        createdById: USER_ID,
      },
    });
    nfseCount++;
  }

  // Atualizar ultimoNumeroDps dos clientes
  for (let i = 0; i < CLIENTES.length; i++) {
    await prisma.clienteMei.update({
      where: { id: clienteIds[i] },
      data: { ultimoNumeroDps: clienteNumeros[i] },
    });
  }

  console.log(`  ${nfseCount} NFS-e criadas`);

  // Faturamento anual
  console.log("Criando faturamento anual...");
  const ano = new Date().getFullYear();

  // Tech Solutions: R$13.300 (16.4%)
  await prisma.faturamentoAnual.create({
    data: {
      clienteMeiId: clienteIds[0],
      ano,
      totalEmitido: 13300,
      quantidadeNotas: 3,
    },
  });

  // Maria Design: R$5.000 (6.2%)
  await prisma.faturamentoAnual.create({
    data: {
      clienteMeiId: clienteIds[1],
      ano,
      totalEmitido: 5000,
      quantidadeNotas: 2,
    },
  });

  // Carlos Consultoria: R$12.000 (14.8%)
  await prisma.faturamentoAnual.create({
    data: {
      clienteMeiId: clienteIds[2],
      ano,
      totalEmitido: 12000,
      quantidadeNotas: 1,
    },
  });

  // Serviços memorizados
  console.log("Criando serviços memorizados...");
  await prisma.servicoMemorizado.create({
    data: {
      clienteMeiId: clienteIds[0],
      apelido: "Manutenção mensal",
      descricaoServico: "Manutenção mensal do sistema de gestão",
      valorPadrao: 2800,
      codigoServico: "010201",
      localPrestacaoIbge: "5300108",
      usoCount: 3,
      ultimoUso: daysAgo(15),
    },
  });

  await prisma.servicoMemorizado.create({
    data: {
      clienteMeiId: clienteIds[0],
      apelido: "Consultoria em TI",
      descricaoServico: "Consultoria em segurança da informação",
      valorPadrao: 6000,
      codigoServico: "010101",
      localPrestacaoIbge: "5300108",
      usoCount: 1,
      ultimoUso: daysAgo(7),
    },
  });

  await prisma.servicoMemorizado.create({
    data: {
      clienteMeiId: clienteIds[1],
      apelido: "Identidade visual",
      descricaoServico: "Criação de identidade visual completa",
      valorPadrao: 3200,
      codigoServico: "070801",
      localPrestacaoIbge: "5300108",
      usoCount: 2,
      ultimoUso: daysAgo(5),
    },
  });

  // Tomadores favoritos
  console.log("Criando tomadores favoritos...");
  await prisma.tomadorFavorito.create({
    data: {
      clienteMeiId: clienteIds[0],
      tipo: "cnpj",
      documento: "11222333000144",
      nome: "Supermercados Brasília LTDA",
      email: "financeiro@superbrasilia.com.br",
      usoCount: 2,
      ultimoUso: daysAgo(15),
    },
  });

  await prisma.tomadorFavorito.create({
    data: {
      clienteMeiId: clienteIds[0],
      tipo: "cpf",
      documento: "12345678909",
      nome: "João Pedro Almeida",
      email: "joao.pedro@email.com",
      usoCount: 1,
      ultimoUso: daysAgo(7),
    },
  });

  await prisma.tomadorFavorito.create({
    data: {
      clienteMeiId: clienteIds[1],
      tipo: "cnpj",
      documento: "99887766000155",
      nome: "Restaurante Sabor & Arte LTDA",
      usoCount: 2,
      ultimoUso: daysAgo(5),
    },
  });

  await prisma.tomadorFavorito.create({
    data: {
      clienteMeiId: clienteIds[2],
      tipo: "cnpj",
      documento: "33445566000177",
      nome: "Indústria Nacional de Alimentos S.A.",
      email: "compras@ina.com.br",
      usoCount: 2,
      ultimoUso: daysAgo(0),
    },
  });

  console.log("\n✔ Seed de demonstração completo!");
  console.log(`  • ${clienteIds.length} clientes MEI`);
  console.log(`  • 2 certificados digitais`);
  console.log(`  • ${nfseCount} NFS-e (autorizadas, rascunho, rejeitada, cancelada, pendente)`);
  console.log(`  • 3 registros de faturamento anual`);
  console.log(`  • 3 serviços memorizados`);
  console.log(`  • 4 tomadores favoritos`);
}

main()
  .catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
