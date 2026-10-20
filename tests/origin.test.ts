import { describe, it, expect } from "vitest";
import { isSameOrigin } from "../src/server/origin";
describe("Origin HTTP", () => {
  it("mengizinkan host browser asli saat Next menormalisasi URL", () => {
    expect(
      isSameOrigin(
        new Request("http://localhost:3000/api/state", {
          headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).toBe(true);
  });
  it.each([
    "https://evil.example",
    "null",
    "http://localhost:9999",
    "https://localhost:3000",
  ])("menolak origin berbeda atau tidak valid %s", (origin) => {
    expect(
      isSameOrigin(
        new Request("http://localhost:3000/api/state", {
          headers: { host: "localhost:3000", origin },
        }),
      ),
    ).toBe(false);
  });
  it("mengizinkan klien lokal tanpa header Origin", () => {
    expect(isSameOrigin(new Request("http://localhost:3000/api/state"))).toBe(
      true,
    );
  });
});
