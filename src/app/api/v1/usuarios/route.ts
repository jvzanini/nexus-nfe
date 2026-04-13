import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/api/auth";
import { apiSuccess, apiCreated, apiError, withErrorHandler } from "@/lib/api/response";
import bcrypt from "bcryptjs";

/**
 * GET /api/v1/usuarios — Listar usuários da plataforma
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, platformRole: true,
      isActive: true, isSuperAdmin: true, createdAt: true,
    },
  });

  return apiSuccess(users);
});

/**
 * POST /api/v1/usuarios — Criar usuário
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireApiKey(request);

  const body = await request.json();
  const { name, email, password, platformRole } = body;

  if (!name || !email || !password) {
    return apiError("VALIDATION", "Campos obrigatórios: name, email, password", 422);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError("DUPLICATE", "E-mail já cadastrado", 409);
  }

  const validRoles = ["admin", "manager", "viewer"];
  const role = validRoles.includes(platformRole) ? platformRole : "viewer";

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      platformRole: role,
    },
    select: { id: true, name: true, email: true, platformRole: true, createdAt: true },
  });

  return apiCreated(user);
});
