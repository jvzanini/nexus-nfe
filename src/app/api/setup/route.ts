// Rota temporária de setup — cria o admin se não existir.
// Será removida após o primeiro login funcionar.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // 1. Verificar conexão com o banco
    const tableCheck = await prisma.$queryRaw`SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = 'public'` as any[];
    const tableCount = Number(tableCheck[0]?.c ?? 0);

    if (tableCount < 5) {
      return NextResponse.json({
        status: "error",
        message: "Banco sem tabelas — migrations não foram aplicadas",
        tableCount,
      });
    }

    // 2. Verificar se admin existe
    const email = process.env.ADMIN_EMAIL || "nexusai360@gmail.com";
    const password = process.env.ADMIN_PASSWORD || "***REMOVED-ADMIN-PASSWORD***";

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, platformRole: true, isActive: true },
    });

    if (user) {
      return NextResponse.json({
        status: "ok",
        message: "Admin já existe",
        user,
        tableCount,
      });
    }

    // 3. Criar admin
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        name: "João Zanini",
        email,
        password: hashedPassword,
        platformRole: "super_admin",
        isSuperAdmin: true,
        isActive: true,
      },
      select: { id: true, email: true, name: true, platformRole: true, isActive: true },
    });

    return NextResponse.json({
      status: "created",
      message: "Admin criado com sucesso!",
      user,
      tableCount,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
