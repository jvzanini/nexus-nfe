import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock do Prisma antes de importar o SUT.
vi.mock("../../prisma", () => {
  return {
    prisma: {
      certificadoDigital: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      notification: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

// Re-importa após mock
import { prisma } from "../../prisma";
import { checkCertificateExpiration } from "../check-expiration";

const mockedPrisma = prisma as unknown as {
  certificadoDigital: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  notification: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function makeCert(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cert-1",
    clienteMeiId: "cli-1",
    notAfter: new Date("2026-05-10T00:00:00Z"),
    nomeArquivo: "cert.pfx",
    clienteMei: {
      razaoSocial: "Fulano MEI",
      createdById: "user-1",
    },
    ...overrides,
  };
}

describe("checkCertificateExpiration", () => {
  const now = new Date("2026-04-10T00:00:00Z"); // 30 dias antes do notAfter padrão

  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.notification.findFirst.mockResolvedValue(null);
  });

  it("retorna zero quando não há certificados próximos de expirar", async () => {
    mockedPrisma.certificadoDigital.findMany.mockResolvedValue([]);

    const r = await checkCertificateExpiration({ now });

    expect(r.totalChecked).toBe(0);
    expect(r.expired).toBe(0);
    expect(r.expiringSoon).toBe(0);
    expect(r.notificationsCreated).toBe(0);
    expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
  });

  it("cria notificação 'warning' pra cert expirando em <30d", async () => {
    const cert = makeCert({
      notAfter: new Date("2026-04-25T00:00:00Z"), // +15d
    });
    mockedPrisma.certificadoDigital.findMany.mockResolvedValue([cert]);

    const r = await checkCertificateExpiration({ now });

    expect(r.expiringSoon).toBe(1);
    expect(r.expired).toBe(0);
    expect(r.notificationsCreated).toBe(1);
    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(1);
    const call = mockedPrisma.notification.create.mock.calls[0][0];
    expect(call.data.type).toBe("warning");
    expect(call.data.title).toMatch(/expirando/i);
    expect(call.data.userId).toBe("user-1");
    expect(call.data.link).toBe("/clientes/cli-1");
    // Não deve marcar como revogado
    expect(mockedPrisma.certificadoDigital.update).not.toHaveBeenCalled();
  });

  it("marca como revogado e cria notificação 'error' quando cert já expirou", async () => {
    const cert = makeCert({
      notAfter: new Date("2026-04-05T00:00:00Z"), // -5d
    });
    mockedPrisma.certificadoDigital.findMany.mockResolvedValue([cert]);

    const r = await checkCertificateExpiration({ now });

    expect(r.expired).toBe(1);
    expect(r.expiringSoon).toBe(0);
    expect(r.notificationsCreated).toBe(1);

    expect(mockedPrisma.certificadoDigital.update).toHaveBeenCalledWith({
      where: { id: "cert-1" },
      data: { revoked: true },
    });

    const call = mockedPrisma.notification.create.mock.calls[0][0];
    expect(call.data.type).toBe("error");
    expect(call.data.title).toMatch(/expirado/i);
  });

  it("dedup: não cria notificação duplicada nas últimas 24h", async () => {
    const cert = makeCert({
      notAfter: new Date("2026-04-25T00:00:00Z"),
    });
    mockedPrisma.certificadoDigital.findMany.mockResolvedValue([cert]);
    mockedPrisma.notification.findFirst.mockResolvedValue({ id: "notif-1" });

    const r = await checkCertificateExpiration({ now });

    expect(r.expiringSoon).toBe(1);
    expect(r.notificationsCreated).toBe(0);
    expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
  });

  it("respeita warningDays customizado", async () => {
    const cert = makeCert({
      notAfter: new Date("2026-04-15T00:00:00Z"), // +5d
    });
    mockedPrisma.certificadoDigital.findMany.mockResolvedValue([cert]);

    await checkCertificateExpiration({ now, warningDays: 7 });

    // Verifica que findMany foi chamado com threshold de +7d
    const whereArg = mockedPrisma.certificadoDigital.findMany.mock
      .calls[0][0] as { where: { notAfter: { lte: Date } } };
    const threshold = whereArg.where.notAfter.lte;
    const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(threshold.getTime()).toBe(expected.getTime());
  });

  it("pula cert quando cliente não tem createdById", async () => {
    const cert = makeCert({
      notAfter: new Date("2026-04-25T00:00:00Z"),
      clienteMei: { razaoSocial: "X", createdById: null },
    });
    mockedPrisma.certificadoDigital.findMany.mockResolvedValue([cert]);

    const r = await checkCertificateExpiration({ now });

    expect(r.expiringSoon).toBe(1);
    expect(r.notificationsCreated).toBe(0);
  });
});
