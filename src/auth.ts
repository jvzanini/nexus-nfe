import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { authorizeCredentials } from "@/lib/auth-helpers";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
  otp: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        otp: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const user = await authorizeCredentials(parsed.data, "0.0.0.0");
          return user;
        } catch (err) {
          if (err instanceof Error && err.message === "2FA_REQUIRED") {
            // Re-throw para que o client consiga identificar
            throw err;
          }
          return null;
        }
      },
    }),
  ],
});
