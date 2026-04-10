import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { authorizeCredentials } from "@/lib/auth-helpers";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

/**
 * Configuração completa do NextAuth v5.
 * Roda no Node Runtime (usa Prisma + bcrypt). NÃO importar este arquivo
 * no middleware — use auth.config.ts lá.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const headersList = await headers();
        const ip =
          headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          headersList.get("x-real-ip") ||
          "0.0.0.0";

        const user = await authorizeCredentials(parsed.data, ip);
        return user;
      },
    }),
  ],
});
