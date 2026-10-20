import { CONFIG } from "./config";
import type {
  Allocation,
  Config,
  Dataset,
  Disruption,
  Mode,
  Order,
  Party,
  Plan,
} from "./types";
export const rootId = (id: string) => id.split("~")[0];
export function capacity(
  base: number,
  businessId: string,
  day: number,
  disruptions: Disruption[],
) {
  const loss = Math.min(
    100,
    disruptions
      .filter(
        (d) =>
          d.businessId === businessId &&
          day >= d.start &&
          day < d.start + d.duration,
      )
      .reduce((s, d) => s + d.loss, 0),
  );
  return Math.floor((base * (100 - loss)) / 100);
}
export function schedule(data: Dataset, config: Config = CONFIG) {
  const allocations: Allocation[] = [];
  const late: string[] = [];
  for (const b of data.businesses) {
    const available = Array.from({ length: config.horizon }, (_, day) =>
      capacity(b.capacity, b.id, day, data.disruptions),
    );
    for (const o of data.orders
      .filter((o) => o.businessId === b.id && o.status === "aktif")
      .sort((a, b) => a.deadline - b.deadline || a.id.localeCompare(b.id))) {
      let remaining = o.quantity;
      for (
        let day = 0;
        day <= Math.min(o.deadline, config.horizon - 1) && remaining > 0;
        day++
      ) {
        const quantity = Math.min(available[day], remaining);
        if (quantity) {
          allocations.push({ orderId: o.id, businessId: b.id, day, quantity });
          available[day] -= quantity;
          remaining -= quantity;
        }
      }
      if (remaining > 0) late.push(o.id);
    }
  }
  return { allocations, late };
}
export function feasibleParties(parties: Party[]) {
  return (
    parties.length > 0 &&
    parties.every((p) => Number.isFinite(p.benefit) && p.benefit >= 0)
  );
}
export function propose(
  data: Dataset,
  target: Order,
  mode: Exclude<Mode, "none"> = "full",
  config: Config = CONFIG,
): Plan[] {
  if (target.status !== "aktif") return [];
  if (
    !Number.isInteger(config.splitUnit) ||
    config.splitUnit <= 0 ||
    !Number.isInteger(config.maxCandidates) ||
    config.maxCandidates < 1
  )
    throw new Error("Batas pencarian tidak valid.");
  const found = data.businesses.find((b) => b.id === target.businessId);
  if (!found) throw new Error("Usaha asal tidak ditemukan.");
  const source = found;
  if (
    data.businesses.some(
      (b) => b.id !== source.id && !Number.isFinite(source.distances[b.id]),
    )
  )
    throw new Error("Jarak antarusaha belum lengkap.");
  const destinations = data.businesses.filter((b) => b.id !== source.id);
  const others = data.orders.filter((o) => o.id !== target.id);
  const flexible =
    mode === "full"
      ? others
          .filter(
            (o) =>
              o.status === "aktif" &&
              o.slack > 0 &&
              o.deadline <= target.deadline + config.maxDelay &&
              destinations.some((b) => b.id === o.businessId),
          )
          .sort(
            (a, b) =>
              a.deadline - b.deadline || a.compensation - b.compensation,
          )
          .slice(0, config.maxFlexible)
      : [];
  const plans: Plan[] = [];
  let attempts = 0;
  const distributions: number[][] = [];
  // Three businesses: enumerate both whole-order and split transfers, retaining exact remainder.
  if (destinations.length === 1) distributions.push([target.quantity]);
  if (destinations.length === 2) {
    for (let n = 0; n < target.quantity; n += config.splitUnit)
      distributions.push([n, target.quantity - n]);
    distributions.push([target.quantity, 0]);
  }
  function visit(index: number, delays: { orderId: string; days: number }[]) {
    if (attempts >= config.maxCandidates) return;
    if (index < flexible.length) {
      const o = flexible[index];
      for (
        let d = 0;
        d <=
        Math.min(o.slack, config.maxDelay, config.horizon - 1 - o.deadline);
        d++
      )
        visit(index + 1, d ? [...delays, { orderId: o.id, days: d }] : delays);
      return;
    }
    for (const parts of distributions) {
      if (attempts++ >= config.maxCandidates) return;
      const transfers = parts
        .map((quantity, i) => ({ businessId: destinations[i].id, quantity }))
        .filter((t) => t.quantity > 0);
      if (
        delays.some(
          (d) =>
            !transfers.some(
              (t) =>
                t.businessId ===
                others.find((o) => o.id === d.orderId)!.businessId,
            ),
        )
      )
        continue;
      const revised = others.map((o) => {
        const d = delays.find((d) => d.orderId === o.id);
        return d
          ? { ...o, deadline: o.deadline + d.days, slack: o.slack - d.days }
          : o;
      });
      const moved = transfers.map((t) => ({
        ...target,
        id: `${rootId(target.id)}~${t.businessId}`,
        businessId: t.businessId,
        quantity: t.quantity,
        slack: 0,
      }));
      const orders = [...revised, ...moved];
      const result = schedule({ ...data, orders }, config);
      if (result.late.length) continue;
      const compensation = delays.reduce(
        (sum, d) =>
          sum + d.days * others.find((o) => o.id === d.orderId)!.compensation,
        0,
      );
      let production = 0,
        transfer = 0,
        quality = 0;
      const receivers: Party[] = transfers.map((t) => {
        const b = data.businesses.find((b) => b.id === t.businessId)!;
        const markup = Math.round(
          t.quantity * b.unitCost * config.receiverMarkup,
        );
        production += (b.unitCost - source.unitCost) * t.quantity + markup;
        transfer +=
          (source.distances[b.id] ?? 0) * config.transferPerKm +
          t.quantity * config.transferPerSheet;
        quality += Math.round(
          Math.max(0, source.quality - b.quality) *
            config.qualityPenalty *
            t.quantity,
        );
        return {
          id: `usaha:${b.id}`,
          name: b.name,
          role: "Penerima · laba jasa produksi",
          benefit: markup,
          approval: "menunggu",
        };
      });
      const total = compensation + production + transfer + quality;
      const parties: Party[] = [
        {
          id: `usaha:${source.id}`,
          name: source.name,
          role: "Usaha terdampak",
          benefit: target.margin + target.cancellationPenalty - total,
          approval: "menunggu",
        },
        ...receivers,
      ];
      for (const d of delays) {
        const o = others.find((o) => o.id === d.orderId)!;
        const customer = data.customers.find((c) => c.id === o.customerId);
        if (!parties.some((p) => p.id === `pelanggan:${o.customerId}`))
          parties.push({
            id: `pelanggan:${o.customerId}`,
            name: customer?.name ?? o.customerId,
            role: "Pelanggan · kompensasi memenuhi tarif",
            benefit: 0,
            approval: "menunggu",
          });
      }
      if (!feasibleParties(parties)) continue;
      // Rerun the exact transfer without any deadline extensions. Missing sheets
      // measure the capacity unlocked by flexibility, including displaced native jobs.
      const idleSchedule = schedule(
        { ...data, orders: [...others, ...moved] },
        config,
      );
      const missing =
        others.reduce(
          (n, o) => n + (o.status === "aktif" ? o.quantity : 0),
          target.quantity,
        ) - idleSchedule.allocations.reduce((n, a) => n + a.quantity, 0);
      const flexibilityQuantity = Math.min(
        target.quantity,
        Math.max(0, missing),
      );
      plans.push({
        id: `${target.id}-R${attempts}`,
        orderId: target.id,
        transfers,
        delays,
        costs: { compensation, production, transfer, quality, total },
        benefit: parties.reduce((s, p) => s + p.benefit, 0),
        parties,
        orders,
        allocations: result.allocations,
        flexibilityQuantity,
        recoveredQuantity: target.quantity,
      });
    }
  }
  visit(0, []);
  return plans
    .sort((a, b) => b.benefit - a.benefit || a.costs.total - b.costs.total)
    .slice(0, 30);
}
export function prepare(data: Dataset, config: Config = CONFIG) {
  const initial = schedule(data, config);
  const threatened = data.orders.filter((o) => initial.late.includes(o.id));
  return {
    threatened,
    working: {
      ...data,
      orders: data.orders.filter((o) => !initial.late.includes(o.id)),
    },
  };
}
export function evaluate(data: Dataset, mode: Mode, config: Config = CONFIG) {
  const { threatened, working } = prepare(data, config);
  let current = working;
  const accepted: Plan[] = [];
  const failed: string[] = [];
  for (const target of threatened) {
    const plan =
      mode === "none" ? undefined : propose(current, target, mode, config)[0];
    if (plan) {
      accepted.push(plan);
      current = { ...current, orders: plan.orders };
    } else failed.push(target.id);
  }
  const active = data.orders.filter((o) => o.status === "aktif").length;
  const recovered = accepted.reduce((s, p) => s + p.recoveredQuantity, 0);
  const flexible = accepted.reduce((s, p) => s + p.flexibilityQuantity, 0);
  const partyMap = new Map<
    string,
    { id: string; name: string; role: string; benefit: number }
  >();
  for (const p of accepted)
    for (const party of p.parties) {
      const previous = partyMap.get(party.id);
      partyMap.set(party.id, {
        id: party.id,
        name: party.name,
        role: party.role,
        benefit: (previous?.benefit ?? 0) + party.benefit,
      });
    }
  const partyBenefits = [...partyMap.values()];
  const finalSchedule = schedule(current, config);
  const originalOnTime = data.orders.filter(
    (o) =>
      o.status === "aktif" &&
      !failed.includes(o.id) &&
      finalSchedule.allocations
        .filter(
          (a) => rootId(a.orderId) === rootId(o.id) && a.day <= o.deadline,
        )
        .reduce((sum, a) => sum + a.quantity, 0) >= o.quantity,
  ).length;
  return {
    mode,
    accepted,
    failed,
    threatened: threatened.length,
    total: active,
    onTime: active - failed.length,
    originalOnTime,
    cost: accepted.reduce((s, p) => s + p.costs.total, 0),
    delayDays: accepted.reduce(
      (s, p) => s + p.delays.reduce((n, d) => n + d.days, 0),
      0,
    ),
    benefit: accepted.reduce((s, p) => s + p.benefit, 0),
    flexiblePercent: recovered ? (flexible / recovered) * 100 : 0,
    recovered,
    partyBenefits,
    working: current,
  };
}
export type ApprovalState = {
  plans: Plan[];
  index: number;
  status: "menunggu" | "disetujui" | "tidak terselamatkan";
  expiresAt: number;
  reason: string;
};
export function beginApproval(
  plans: Plan[],
  now: number,
  config: Config = CONFIG,
): ApprovalState {
  return {
    plans: structuredClone(plans),
    index: 0,
    status: plans.length ? "menunggu" : "tidak terselamatkan",
    expiresAt: now + config.approvalSeconds * 1000,
    reason: plans.length
      ? ""
      : "Tidak ada rencana yang memenuhi kapasitas, tenggat, dan manfaat semua pihak.",
  };
}
export function respond(
  state: ApprovalState,
  partyId: string,
  decision: "setuju" | "tolak",
  now: number,
  config: Config = CONFIG,
): ApprovalState {
  if (state.status !== "menunggu") return state;
  const next = structuredClone(state);
  const expired = now >= state.expiresAt;
  if (!expired) {
    const party = next.plans[next.index].parties.find((p) => p.id === partyId);
    if (!party || party.approval !== "menunggu") return state;
    party.approval = decision;
  }
  if (expired || decision === "tolak") {
    next.index++;
    next.reason = expired
      ? "Batas waktu persetujuan habis."
      : "Salah satu pihak menolak.";
    next.expiresAt = now + config.approvalSeconds * 1000;
    if (next.index >= next.plans.length) next.status = "tidak terselamatkan";
  } else if (
    next.plans[next.index].parties.every((p) => p.approval === "setuju")
  ) {
    next.status = "disetujui";
    next.reason = "";
  }
  return next;
}
