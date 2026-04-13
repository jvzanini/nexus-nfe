// TEMPORÁRIO — diagnóstico de login. Será removido.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const steps: string[] = [];

    // Step 1: buscar usuário
    steps.push(`1. Buscando ${email}...`);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, password: true, isActive: true, platformRole: true },
    });

    if (!user) {
      steps.push("FALHOU: usuário não encontrado no banco");
      return NextResponse.json({ steps, success: false });
    }
    steps.push(`2. Encontrado: ${user.id}, active=${user.isActive}, role=${user.platformRole}`);

    if (!user.isActive) {
      steps.push("FALHOU: usuário inativo");
      return NextResponse.json({ steps, success: false });
    }

    // Step 2: verificar senha
    steps.push(`3. Verificando senha... (hash começa com: ${user.password.substring(0, 10)})`);
    const valid = await bcrypt.compare(password, user.password);
    steps.push(`4. Senha válida: ${valid}`);

    if (!valid) {
      // Tentar re-hash e comparar
      const newHash = await bcrypt.hash(password, 10);
      steps.push(`5. Re-hash gerado: ${newHash.substring(0, 10)}...`);
      steps.push("FALHOU: senha incorreta");
    }

    // Step 3: testar Redis
    try {
      const { redis } = await import("@/lib/redis");
      await redis.ping();
      steps.push("6. Redis: OK");
    } catch (e: any) {
      steps.push(`6. Redis: FALHOU (${e.message})`);
    }

    // Step 4: testar rate limit
    try {
      const { checkLoginRateLimit } = await import("@/lib/rate-limit");
      const rl = await checkLoginRateLimit(email, "0.0.0.0");
      steps.push(`7. Rate limit: allowed=${rl.allowed}, remaining=${rl.remaining}`);
    } catch (e: any) {
      steps.push(`7. Rate limit: FALHOU (${e.message})`);
    }

    return NextResponse.json({ steps, success: valid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.split("\n").slice(0, 5) }, { status: 500 });
  }
}
