import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "[seed] ADMIN_EMAIL e ADMIN_PASSWORD não definidos. Pulando seed do super admin."
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      platformRole: "super_admin",
      isSuperAdmin: true,
      isActive: true,
    },
    create: {
      name: "Super Admin",
      email,
      password: hashedPassword,
      platformRole: "super_admin",
      isSuperAdmin: true,
      isActive: true,
    },
  });

  console.log(`[seed] Super admin pronto: ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error("[seed] Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
