import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

import { sendNotificationEmail } from "@/lib/notifications-email";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const baseInput = {
  userId: "u1",
  type: "warning" as const,
  title: "Alerta",
  message: "Mensagem teste",
  link: "/clientes/abc",
};

describe("sendNotificationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna opted_out quando usuário desativa notificações", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      email: "a@b.com",
      emailNotifications: false,
      isActive: true,
    });

    const result = await sendNotificationEmail(baseInput);

    expect(result).toEqual({ sent: false, reason: "opted_out" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("retorna user_not_found quando não existe usuário", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const result = await sendNotificationEmail(baseInput);

    expect(result).toEqual({ sent: false, reason: "user_not_found" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("retorna no_email quando usuário não tem email", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      email: null,
      emailNotifications: true,
      isActive: true,
    });

    const result = await sendNotificationEmail(baseInput);

    expect(result).toEqual({ sent: false, reason: "no_email" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("envia email quando opt-in e retorna sent: true", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      email: "user@test.com",
      emailNotifications: true,
      isActive: true,
    });
    (sendEmail as any).mockResolvedValue({ success: true });

    const result = await sendNotificationEmail(baseInput);

    expect(result).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = (sendEmail as any).mock.calls[0][0];
    expect(arg.to).toBe("user@test.com");
    expect(arg.subject).toContain("Alerta");
    expect(arg.html).toContain("Mensagem teste");
    expect(arg.html).toContain("/clientes/abc");
  });

  it("propaga erro como sent: false quando sendEmail falha", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      email: "user@test.com",
      emailNotifications: true,
      isActive: true,
    });
    (sendEmail as any).mockResolvedValue({ success: false, error: "boom" });

    const result = await sendNotificationEmail(baseInput);

    expect(result.sent).toBe(false);
    expect(result.reason).toBe("boom");
  });
});
