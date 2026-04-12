import { describe, it, expect, vi } from "vitest";
import { logNfse, withTiming } from "../logger";

describe("logNfse", () => {
  it("loga operação sem erro como INFO", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logNfse({ operation: "test-op", nfseId: "123" });
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.level).toBe("INFO");
    expect(logged.operation).toBe("test-op");
    spy.mockRestore();
  });

  it("loga operação com erro como ERROR", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logNfse({ operation: "test-op", error: "falhou" });
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.level).toBe("ERROR");
    spy.mockRestore();
  });

  it("remove campos sensíveis dos details", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logNfse({
      operation: "test",
      details: {
        pfx: "secret-pfx-data",
        senha: "secret-password",
        privateKey: "key-data",
        safeField: "visible",
      },
    });
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.details.pfx).toBeUndefined();
    expect(logged.details.senha).toBeUndefined();
    expect(logged.details.privateKey).toBeUndefined();
    expect(logged.details.safeField).toBe("visible");
    spy.mockRestore();
  });

  it("mascara CNPJ nos details", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logNfse({
      operation: "test",
      details: { cnpj: "12345678000190" },
    });
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.details.cnpj).toBe("123***190");
    spy.mockRestore();
  });
});

describe("withTiming", () => {
  it("retorna o resultado e loga a duração", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await withTiming("test-op", async () => 42);
    expect(result).toBe(42);
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.durationMs).toBeGreaterThanOrEqual(0);
    spy.mockRestore();
  });

  it("loga erro e re-throw", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      withTiming("fail-op", async () => { throw new Error("boom"); })
    ).rejects.toThrow("boom");
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.error).toBe("boom");
    spy.mockRestore();
  });
});
