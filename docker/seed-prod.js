// Seed de produção — cria super admin se não existir.
// Roda no entrypoint do container antes do app iniciar.

const bcrypt = require("bcryptjs");

async function main() {
  const { PrismaClient } = require("./src/generated/prisma/client");
  const prisma = new PrismaClient();

  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.log("[seed] ADMIN_EMAIL/ADMIN_PASSWORD não definidos, pulando.");
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`[seed] Admin ${email} já existe (${existing.id}).`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: "Super Admin",
        email,
        password: hashedPassword,
        platformRole: "super_admin",
        isSuperAdmin: true,
        isActive: true,
      },
    });

    console.log(`[seed] Super admin criado: ${user.email} (${user.id})`);
  } catch (err) {
    console.error("[seed] Erro:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
