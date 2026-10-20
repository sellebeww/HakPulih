import { describe, it, expect } from "vitest";
import { seed, scenario } from "../src/core/seed";
import { CONFIG } from "../src/core/config";
import {
  schedule,
  prepare,
  propose,
  evaluate,
  capacity,
  feasibleParties,
  beginApproval,
  respond,
} from "../src/core/solver";
describe("Mesin pemulihan", () => {
  it("kehilangan 80 persen menyisakan tepat 500 lembar dari 2500", () => {
    expect(
      capacity(2500, "B", 0, [
        { id: "G", businessId: "B", start: 0, duration: 2, loss: 80 },
      ]),
    ).toBe(500);
  });
  it("evaluasi tidak memutasi input dan tenggat tetap dalam kelonggaran", () => {
    const d = scenario("S1");
    const before = structuredClone(d);
    const result = evaluate(d, "full");
    expect(d).toEqual(before);
    for (const o of result.working.orders) {
      const original = d.orders.find((p) => p.id === o.id);
      if (original)
        expect(o.deadline).toBeLessThanOrEqual(
          original.deadline + original.slack,
        );
    }
    expect(result.flexiblePercent).toBeGreaterThan(0);
    expect(evaluate(d, "idle").flexiblePercent).toBe(0);
  });
  it("full mengungguli mitra cadangan pada minimal dua skenario", () => {
    expect(
      ["S1", "S2", "S3", "S4"].filter((id) => {
        const c = {
          ...CONFIG,
          qualityPenalty: id === "S4" ? 1000 : CONFIG.qualityPenalty,
        };
        return (
          evaluate(scenario(id), "full", c).onTime >
          evaluate(scenario(id), "idle", c).onTime
        );
      }).length,
    ).toBeGreaterThanOrEqual(2);
  });
  it("seed berisi 36 pesanan dan tidak terlambat sebelum gangguan", () => {
    expect(seed().orders).toHaveLength(36);
    expect(schedule(seed()).late).toEqual([]);
  });
  it("gangguan menandai pesanan A terancam", () => {
    expect(
      prepare(scenario("S1")).threatened.some((o) => o.businessId === "A"),
    ).toBe(true);
  });
  it("kapasitas gangguan bertumpuk tidak negatif", () => {
    expect(
      capacity(3000, "A", 0, [
        { id: "1", businessId: "A", start: 0, duration: 2, loss: 80 },
        { id: "2", businessId: "A", start: 0, duration: 1, loss: 80 },
      ]),
    ).toBe(0);
  });
  it("full menyelamatkan lebih banyak dari idle pada S1", () => {
    expect(evaluate(scenario("S1"), "full").onTime).toBeGreaterThan(
      evaluate(scenario("S1"), "idle").onTime,
    );
  });
  it("dua gangguan mengurangi pemulihan", () => {
    const s2 = evaluate(scenario("S2"), "full");
    expect(s2.threatened).toBeGreaterThan(
      evaluate(scenario("S1"), "full").threatened,
    );
    expect(schedule(s2.working).late).toEqual([]);
  });
  it("kapasitas nol menghasilkan tanpa solusi", () => {
    const d = scenario("S1");
    d.businesses.forEach((b) => (b.capacity = 0));
    expect(evaluate(d, "full").accepted).toHaveLength(0);
  });
  it("kompensasi mahal menolak penundaan yang merugikan", () => {
    expect(
      evaluate(scenario("S3"), "full").accepted.every(
        (p) => p.delays.length === 0,
      ),
    ).toBe(true);
  });
  it("satu pihak rugi membuat rencana tidak layak", () => {
    expect(
      feasibleParties([
        { id: "x", name: "x", role: "x", benefit: -1, approval: "menunggu" },
      ]),
    ).toBe(false);
    const d = scenario("S1");
    const { working, threatened } = prepare(d);
    expect(
      propose(working, threatened[0], "full", {
        ...CONFIG,
        receiverMarkup: -1,
      }),
    ).toHaveLength(0);
  });
  it("penalti mutu tinggi mengurangi manfaat atau menghapus rencana", () => {
    const d = scenario("S4");
    expect(
      evaluate(d, "full", { ...CONFIG, qualityPenalty: 1000 }).benefit,
    ).toBeLessThanOrEqual(evaluate(d, "full").benefit);
  });
  it("alokasi bersama tidak melampaui kapasitas dan jumlah lengkap", () => {
    const d = scenario("S1");
    const r = evaluate(d, "full");
    const s = schedule(r.working);
    for (const b of d.businesses)
      for (let day = 0; day < 14; day++)
        expect(
          s.allocations
            .filter((a) => a.day === day && a.businessId === b.id)
            .reduce((n, a) => n + a.quantity, 0),
        ).toBeLessThanOrEqual(capacity(b.capacity, b.id, day, d.disruptions));
    for (const p of r.accepted)
      expect(p.transfers.reduce((s, t) => s + t.quantity, 0)).toBe(
        p.recoveredQuantity,
      );
  });
  it("penolakan dan timeout beralih, persetujuan harus lengkap", () => {
    const d = scenario("S1");
    const { working, threatened } = prepare(d);
    const plans = propose(working, threatened[0]);
    expect(plans.length).toBeGreaterThan(1);
    let a = beginApproval(plans, 0);
    a = respond(a, a.plans[0].parties[0].id, "tolak", 1);
    expect(a.index).toBe(1);
    a = respond(a, "", "tolak", a.expiresAt);
    expect(a.index).toBe(2);
    for (const p of a.plans[a.index].parties)
      a = respond(a, p.id, "setuju", a.expiresAt - 1);
    expect(a.status).toBe("disetujui");
  });
  it("penolakan seluruh alternatif berakhir tidak terselamatkan", () => {
    const d = scenario("S1");
    const { working, threatened } = prepare(d);
    let a = beginApproval(propose(working, threatened[0]).slice(0, 1), 0);
    a = respond(a, a.plans[0].parties[0].id, "tolak", 1);
    expect(a.status).toBe("tidak terselamatkan");
  });
});

describe("Regresi audit", () => {
  it("pesanan selesai tidak ditunda atau dipulihkan", () => {
    const d = scenario("S1");
    d.orders
      .filter((o) => o.businessId !== "A")
      .forEach((o) => (o.status = "selesai"));
    const { working, threatened } = prepare(d);
    const plans = propose(working, threatened[0]);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.delays.length === 0)).toBe(true);
    expect(propose(d, { ...d.orders[0], status: "selesai" })).toEqual([]);
  });
  it("suara pihak yang sama tidak boleh ditimpa", () => {
    const { working, threatened } = prepare(scenario("S1"));
    let s = beginApproval(propose(working, threatened[0]), 0);
    const id = s.plans[0].parties[0].id;
    s = respond(s, id, "setuju", 1);
    expect(respond(s, id, "tolak", 2)).toBe(s);
  });
  it("jarak yang hilang tidak dianggap transfer gratis", () => {
    const d = scenario("S1");
    delete d.businesses[0].distances.B;
    const { working, threatened } = prepare(d);
    expect(() => propose(working, threatened[0])).toThrow("Jarak");
  });
  it("langkah pencarian nol tidak membuat loop tanpa akhir", () => {
    const { working, threatened } = prepare(scenario("S1"));
    expect(() =>
      propose(working, threatened[0], "full", { ...CONFIG, splitUnit: 0 }),
    ).toThrow("Batas");
  });
  it("nama sama tidak menggabungkan manfaat dua pihak berbeda", () => {
    const d = scenario("S1");
    d.businesses.forEach((b) => (b.name = "Nama sama"));
    const r = evaluate(d, "full");
    expect(
      r.partyBenefits.filter((p) => p.name === "Nama sama").length,
    ).toBeGreaterThan(1);
    expect(r.partyBenefits.reduce((n, p) => n + p.benefit, 0)).toBe(r.benefit);
  });
});
