import { Suspense } from "react";
import { VerifyEmailContent } from "@/components/login/verify-email-content";

export const metadata = {
  title: "Verificar e-mail",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
