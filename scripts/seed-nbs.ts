import { PrismaClient } from "../src/generated/prisma/client";
import { parseNbsSheet } from "../src/lib/nfse/nbs-parser";

const CHUNK_SIZE = 50;

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Parseando planilha NBS...");
    const records = parseNbsSheet();
    console.log(`${records.length} registros encontrados.`);

    let upserted = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      await prisma.$transaction(
        chunk.map((r) =>
          prisma.codigoTributacaoNacional.upsert({
            where: { codigo: r.codigo },
            update: {
              descricao: r.descricao,
              aliquotaMin: r.aliquotaMin,
              aliquotaMax: r.aliquotaMax,
              nivel: r.nivel,
              parentCodigo: r.parentCodigo,
            },
            create: {
              codigo: r.codigo,
              descricao: r.descricao,
              aliquotaMin: r.aliquotaMin,
              aliquotaMax: r.aliquotaMax,
              nivel: r.nivel,
              parentCodigo: r.parentCodigo,
            },
          }),
        ),
      );

      upserted += chunk.length;
      console.log(`  ${upserted}/${records.length}`);
    }

    console.log(`Seed concluído: ${upserted} códigos de tributação nacional.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
