import { Suspense } from "react";
import { LoginContent } from "@/components/login/login-content";
import { APP_CONFIG } from "@/lib/app.config";

export const metadata = {
  title: `Login | ${APP_CONFIG.name}`,
  description: `Acesse o painel do ${APP_CONFIG.name}`,
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
