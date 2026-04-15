import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Verifica se o email+senha precisam de 2FA.
 * Resposta mínima para evitar enumeração: retorna 200 com { needs2fa: bool }
 * apenas quando password confere. Em outros casos retorna 401 genérico.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").toLowerCase().trim();
    const password = String(body?.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { password: true, isActive: true, twoFactorEnabled: true },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }
    return NextResponse.json({ needs2fa: user.twoFactorEnabled });
  } catch {
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
