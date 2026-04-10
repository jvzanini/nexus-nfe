// App Config — Identidade centralizada da plataforma
// Gerado automaticamente pelo Blueprint Nexus AI

export const APP_CONFIG = {
  // === Identidade ===
  name: "Nexus NFE",
  shortName: "NFE",
  description: "Emissão automatizada de notas fiscais para MEIs via GOV.BR",
  domain: "nfe.nexusai360.com",

  // === Visual ===
  logo: "/logo.png",
  brandDark: "/marca-dark.png",
  brandLight: "/marca-light.png",

  // === Email ===
  emailFrom: "Nexus NFE <noreply@nexusai360.com>",
  emailDomain: "nexusai360.com",

  // === Deploy ===
  registry: "ghcr.io/jvzanini",
  projectSlug: "nexus-nfe",
  network: "rede_nexusAI",

  // === Módulos habilitados ===
  features: {
    multiTenant: false,
    notifications: true,
    auditLog: true,
    realtime: false,
    encryption: true,
    toast: true,
    dashboard: true,
    queue: true,
    settings: true,
    billing: false,
    apiKeys: false,
    onboarding: false,
    search: false,
    outbox: true,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
