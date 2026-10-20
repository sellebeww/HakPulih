import { CONFIG } from "./config";
import { scenario, SCENARIOS } from "./seed";
import {
  beginApproval,
  prepare,
  propose,
  respond,
  type ApprovalState,
} from "./solver";
import { parseDataset, record } from "./validation";
import type { Config, Dataset, Order, Plan } from "./types";
export type DecisionEvent =
  | {
      type: "vote";
      planId: string;
      partyId: string;
      decision: "setuju" | "tolak";
      at: number;
    }
  | { type: "timeout"; planId: string; at: number }
  | { type: "advance"; orderId: string; at: number };
export type Simulation = {
  data: Dataset;
  selected: string;
  config: Config;
  startedAt: number;
  events: DecisionEvent[];
  queue: Order[];
  working: Dataset;
  history: { orderId: string; plan?: Plan; reason?: string }[];
  flow: ApprovalState | null;
};
export function createSimulation(
  data: Dataset,
  selected: string,
  config: Config,
  now: number,
): Simulation {
  const { working, threatened } = prepare(data, config);
  return {
    data,
    selected,
    config,
    startedAt: now,
    events: [],
    queue: threatened,
    working,
    history: [],
    flow: threatened.length
      ? beginApproval(
          propose(working, threatened[0], "full", config),
          now,
          config,
        )
      : null,
  };
}
export function transition(
  state: Simulation,
  event: DecisionEvent,
): Simulation {
  const flow = state.flow;
  if (!flow) return state;
  if (event.type === "advance") {
    if (flow.status === "menunggu" || event.orderId !== state.queue[0]?.id)
      return state;
    const accepted =
      flow.status === "disetujui" ? flow.plans[flow.index] : undefined;
    const working = accepted
      ? { ...state.working, orders: accepted.orders }
      : state.working;
    const queue = state.queue.slice(1);
    return {
      ...state,
      working,
      queue,
      events: [...state.events, event],
      history: [
        ...state.history,
        { orderId: event.orderId, plan: accepted, reason: flow.reason },
      ],
      flow: queue.length
        ? beginApproval(
            propose(working, queue[0], "full", state.config),
            event.at,
            state.config,
          )
        : null,
    };
  }
  if (flow.status !== "menunggu" || flow.plans[flow.index]?.id !== event.planId)
    return state;
  if (event.type === "timeout" && event.at < flow.expiresAt) return state;
  const updated = respond(
    flow,
    event.type === "vote" ? event.partyId : "",
    event.type === "vote" ? event.decision : "tolak",
    event.at,
    state.config,
  );
  return updated === flow
    ? state
    : { ...state, flow: updated, events: [...state.events, event] };
}
export function serializeSession(state: Simulation, base: Dataset) {
  return JSON.stringify({
    version: 1,
    baseline: JSON.stringify(base),
    selected: state.selected,
    quality: state.config.qualityPenalty,
    disruptions: state.data.disruptions,
    startedAt: state.startedAt,
    events: state.events,
  });
}
export function restoreSession(raw: string, base: Dataset): Simulation | null {
  try {
    const v: unknown = JSON.parse(raw);
    if (
      !record(v) ||
      v.version !== 1 ||
      v.baseline !== JSON.stringify(base) ||
      typeof v.selected !== "string" ||
      !Number.isSafeInteger(v.quality) ||
      Number(v.quality) < 0 ||
      Number(v.quality) > 10000 ||
      typeof v.startedAt !== "number" ||
      !Number.isFinite(v.startedAt) ||
      !Array.isArray(v.events) ||
      v.events.length > 2000
    )
      return null;
    if (v.selected !== "manual" && !SCENARIOS.some((s) => s.id === v.selected))
      return null;
    const data =
      v.selected === "manual"
        ? parseDataset({ ...base, disruptions: v.disruptions })
        : scenario(v.selected, base);
    let state = createSimulation(
      data,
      v.selected,
      { ...CONFIG, qualityPenalty: Number(v.quality) },
      v.startedAt,
    );
    let lastTime = v.startedAt;
    for (const event of v.events) {
      if (
        !record(event) ||
        typeof event.at !== "number" ||
        !Number.isFinite(event.at) ||
        event.at < lastTime
      )
        return null;
      if (event.type === "vote") {
        if (
          typeof event.planId !== "string" ||
          typeof event.partyId !== "string" ||
          !["setuju", "tolak"].includes(String(event.decision))
        )
          return null;
      } else if (event.type === "timeout") {
        if (typeof event.planId !== "string") return null;
      } else if (event.type === "advance") {
        if (typeof event.orderId !== "string") return null;
      } else return null;
      const next = transition(state, event as DecisionEvent);
      if (next === state) return null;
      state = next;
      lastTime = event.at;
    }
    return state;
  } catch {
    return null;
  }
}
