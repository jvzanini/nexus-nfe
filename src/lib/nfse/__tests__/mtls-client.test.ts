import { describe, it, expect } from "vitest";
import https from "node:https";
import { createMtlsAgent } from "../mtls-client";

describe("createMtlsAgent", () => {
  it("retorna uma instância de https.Agent", () => {
    const agent = createMtlsAgent("fake-key-pem", "fake-cert-pem");
    expect(agent).toBeInstanceOf(https.Agent);
  });

  it("configura key e cert nas options", () => {
    const agent = createMtlsAgent("my-key", "my-cert");
    expect(agent.options.key).toBe("my-key");
    expect(agent.options.cert).toBe("my-cert");
  });

  it("habilita rejectUnauthorized", () => {
    const agent = createMtlsAgent("k", "c");
    expect(agent.options.rejectUnauthorized).toBe(true);
  });
});
