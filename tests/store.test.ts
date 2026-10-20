import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStore } from "../src/server/store";
import { seed } from "../src/core/seed";
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "hakpulih-store-test-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
const order = (id: string) => ({ ...seed().orders[0], id: `M-${id}` });
describe("Penyimpanan JSON", () => {
  it("seed ketika berkas belum ada, simpan lalu baca dari instance baru", async () => {
    const store = createStore(directory);
    expect((await store.read()).orders).toHaveLength(36);
    await store.mutate({ action: "add", order: order("test") });
    expect((await createStore(directory).read()).orders.at(-1)?.id).toBe(
      "M-test",
    );
  });
  it("penambahan bersamaan tidak kehilangan perubahan", async () => {
    const s = createStore(directory);
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        s.mutate({ action: "add", order: order(String(i)) }),
      ),
    );
    expect((await s.read()).orders).toHaveLength(44);
  });
  it("duplikat ditolak dan antrean pulih setelah kegagalan", async () => {
    const s = createStore(directory);
    await s.mutate({ action: "add", order: order("same") });
    await expect(
      s.mutate({ action: "add", order: order("same") }),
    ).rejects.toThrow("sudah digunakan");
    await s.mutate({ action: "add", order: order("next") });
    expect((await s.read()).orders).toHaveLength(38);
  });
  it.each([
    { quantity: -1 },
    { margin: 2000000 },
    { deadline: 11 },
    { slack: 4 },
    { compensation: 1.5 },
    { customerId: "missing" },
    { quantity: Infinity },
    { value: 1000000001 },
  ])("menolak input tidak valid %j", async (invalid) => {
    const s = createStore(directory);
    await expect(
      s.mutate({ action: "add", order: { ...order("bad"), ...invalid } }),
    ).rejects.toThrow();
    expect((await s.read()).orders).toHaveLength(36);
  });
  it("hanya menyimpan kolom yang diizinkan dan status aktif", async () => {
    const s = createStore(directory);
    await s.mutate({
      action: "add",
      order: {
        ...order("extra"),
        status: "selesai",
        admin: true,
        extra: "private",
      },
    });
    const saved = (await s.read()).orders.at(-1)!;
    expect(saved.status).toBe("aktif");
    expect(saved).not.toHaveProperty("admin");
    expect(saved).not.toHaveProperty("extra");
  });
  it("berkas rusak tidak ditimpa saat tambah dan dapat dipulihkan melalui reset eksplisit", async () => {
    const s = createStore(directory);
    await writeFile(path.join(directory, "state.json"), "{broken");
    await expect(s.read()).rejects.toThrow();
    await expect(
      s.mutate({ action: "add", order: order("lost") }),
    ).rejects.toThrow();
    expect(await readFile(path.join(directory, "state.json"), "utf8")).toBe(
      "{broken",
    );
    await s.mutate({ action: "reset" });
    expect(await s.read()).toEqual(seed());
  });
  it("struktur data sah JSON tetapi salah ditolak", async () => {
    await writeFile(path.join(directory, "state.json"), '{"orders":[]}');
    await expect(createStore(directory).read()).rejects.toThrow("Struktur");
  });
});
