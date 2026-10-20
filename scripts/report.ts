import { evaluate } from "../src/core/solver";
import { scenario } from "../src/core/seed";
import { CONFIG } from "../src/core/config";
for (const id of ["S1", "S2", "S3", "S4"]) {
  const data = scenario(id);
  const config = {
    ...CONFIG,
    qualityPenalty: id === "S4" ? 1000 : CONFIG.qualityPenalty,
  };
  for (const mode of ["none", "idle", "full"] as const) {
    const r = evaluate(data, mode, config);
    console.log(
      JSON.stringify({
        scenario: id,
        mode,
        onTime: r.onTime,
        original: r.originalOnTime,
        total: r.total,
        cost: r.cost,
        delay: r.delayDays,
        benefit: r.benefit,
        flex: r.flexiblePercent,
        threatened: r.threatened,
        plans: r.accepted.map((p) => ({
          order: p.orderId,
          transfers: p.transfers,
          delays: p.delays,
        })),
      }),
    );
  }
}
