export type Business = {
  id: string;
  name: string;
  capacity: number;
  unitCost: number;
  quality: number;
  distances: Record<string, number>;
};
export type Customer = { id: string; name: string };
export type Order = {
  id: string;
  customerId: string;
  businessId: string;
  quantity: number;
  deadline: number;
  slack: number;
  compensation: number;
  value: number;
  margin: number;
  cancellationPenalty: number;
  status: "aktif" | "selesai";
};
export type Disruption = {
  id: string;
  businessId: string;
  start: number;
  duration: number;
  loss: number;
};
export type Dataset = {
  businesses: Business[];
  customers: Customer[];
  orders: Order[];
  disruptions: Disruption[];
};
export type Config = {
  transferPerKm: number;
  transferPerSheet: number;
  qualityPenalty: number;
  receiverMarkup: number;
  splitUnit: number;
  maxFlexible: number;
  maxDelay: number;
  maxCandidates: number;
  approvalSeconds: number;
  horizon: number;
};
export type Allocation = {
  orderId: string;
  businessId: string;
  day: number;
  quantity: number;
};
export type Party = {
  id: string;
  name: string;
  role: string;
  benefit: number;
  approval: "menunggu" | "setuju" | "tolak";
};
export type Plan = {
  id: string;
  orderId: string;
  transfers: { businessId: string; quantity: number }[];
  delays: { orderId: string; days: number }[];
  costs: {
    compensation: number;
    production: number;
    transfer: number;
    quality: number;
    total: number;
  };
  benefit: number;
  parties: Party[];
  orders: Order[];
  allocations: Allocation[];
  flexibilityQuantity: number;
  recoveredQuantity: number;
};
export type Mode = "none" | "idle" | "full";
