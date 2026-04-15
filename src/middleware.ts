import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

// IMPORTANTE: o middleware usa APENAS authConfig (edge-safe).
// Nunca importe de "./auth" aqui (carrega Prisma/bcrypt).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protege tudo exceto assets estáticos, imagens, favicon, health e rotas do NextAuth
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/health|api/auth|api/v1|api/public|v/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
