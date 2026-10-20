import { describe, it, expect } from "vitest";
import { CONFIG } from "../src/core/config";
import { scenario, seed } from "../src/core/seed";
import {
  createSimulation,
  transition,
  restoreSession,
  serializeSession,
} from "../src/core/session";
const create = () => createSimulation(scenario("S1"), "S1", CONFIG, 1000);
describe("Sesi peninjauan", () => {
  it("keputusan pulih setelah muat ulang tanpa menyimpan seluruh kandidat", () => {
    let s = create();
    const plan = s.flow!.plans[0];
    s = transition(s, {
      type: "vote",
      planId: plan.id,
      partyId: plan.parties[0].id,
      decision: "setuju",
      at: 1100,
    });
    const restored = restoreSession(serializeSession(s, seed()), seed());
    expect(restored?.flow).toEqual(s.flow);
    expect(serializeSession(s, seed()).length).toBeLessThan(16000);
  });
  it("klik dari rencana lama tidak menyetujui alternatif baru", () => {
    const initial = create();
    const plan = initial.flow!.plans[0];
    const next = transition(initial, {
      type: "vote",
      planId: plan.id,
      partyId: plan.parties[0].id,
      decision: "tolak",
      at: 1100,
    });
    expect(
      transition(next, {
        type: "vote",
        planId: plan.id,
        partyId: plan.parties[1].id,
        decision: "setuju",
        at: 1200,
      }),
    ).toBe(next);
  });
  it("tidak boleh menerapkan rencana yang belum disetujui", () => {
    const s = create();
    expect(
      transition(s, { type: "advance", orderId: s.queue[0].id, at: 1100 }),
    ).toBe(s);
  });
  it("persetujuan lengkap menerapkan kapasitas satu kali dan dapat direplay", () => {
    let s = create();
    const plan = s.flow!.plans[0];
    let at = 1100;
    for (const p of plan.parties)
      s = transition(s, {
        type: "vote",
        planId: plan.id,
        partyId: p.id,
        decision: "setuju",
        at: at++,
      });
    expect(s.flow?.status).toBe("disetujui");
    const event = {
      type: "advance" as const,
      orderId: s.queue[0].id,
      at: at++,
    };
    s = transition(s, event);
    expect(s.history).toHaveLength(1);
    expect(s.working.orders).toEqual(plan.orders);
    expect(transition(s, event)).toBe(s);
    expect(
      restoreSession(serializeSession(s, seed()), seed())?.history,
    ).toEqual(s.history);
  });
  it("timeout terlalu dini diabaikan dan timeout sah pulih dari log", () => {
    const s = create();
    const id = s.flow!.plans[0].id;
    expect(transition(s, { type: "timeout", planId: id, at: 1100 })).toBe(s);
    const next = transition(s, {
      type: "timeout",
      planId: id,
      at: s.flow!.expiresAt,
    });
    expect(next.flow?.index).toBe(1);
    expect(
      restoreSession(serializeSession(next, seed()), seed())?.flow,
    ).toEqual(next.flow);
  });
  it("sesi rusak atau dari baseline berbeda ditolak", () => {
    const s = create();
    expect(restoreSession("{", seed())).toBeNull();
    const other = seed();
    other.orders[0].quantity++;
    expect(restoreSession(serializeSession(s, seed()), other)).toBeNull();
  });
});
