// Cria uma API Key para acesso à API REST.
// Uso: npx tsx scripts/create-api-key.ts "nome-da-chave"

import { PrismaClient } from "../src/generated/prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Uso: npx tsx scripts/create-api-key.ts <nome>");
    process.exit(1);
  }

  const key = `nxnfe_${randomBytes(32).toString("hex")}`;
  const newKey = { key, name, createdAt: new Date().toISOString() };

  const setting = await prisma.globalSettings.findUnique({
    where: { key: "API_KEYS" },
  });

  const existing = setting?.value ? JSON.parse(setting.value as string) : [];
  existing.push(newKey);

  await prisma.globalSettings.upsert({
    where: { key: "API_KEYS" },
    create: { key: "API_KEYS", value: JSON.stringify(existing), updatedBy: SYSTEM_USER_ID },
    update: { value: JSON.stringify(existing) },
  });

  console.log(`API Key criada com sucesso!\n`);
  console.log(`Nome:  ${name}`);
  console.log(`Chave: ${key}`);
  console.log(`\nUso:`);
  console.log(`  curl -H "X-API-Key: ${key}" http://localhost:3000/api/v1/nfse`);
}

main()
  .catch((err) => {
    console.error("Erro:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
