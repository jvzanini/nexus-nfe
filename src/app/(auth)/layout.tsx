import { APP_CONFIG } from "@/lib/app.config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#09090b]">
      {/* Background gradiente violeta */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-[#09090b] to-purple-950/60" />

      {/* Blur circles decorativos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-violet-600/8 blur-[100px] sm:blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[250px] w-[250px] sm:h-[400px] sm:w-[400px] rounded-full bg-purple-600/8 blur-[100px] sm:blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Conteúdo centralizado */}
      <div className="relative z-10 flex flex-1 items-center justify-center w-full max-w-md px-6 py-12">
        {children}
      </div>

      {/* Footer */}
      <div className="relative z-10 pb-6">
        <p className="text-xs text-zinc-600">
          {APP_CONFIG.name} &copy; {new Date().getFullYear()}. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
