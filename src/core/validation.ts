import type { Dataset, Order } from "./types";
export class ValidationError extends Error {}
export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const integer = (
  value: unknown,
  min = 0,
  max = 1_000_000_000,
): value is number =>
  Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
export function parseOrder(
  value: unknown,
  data: Pick<Dataset, "businesses" | "customers">,
  manual = true,
): Order {
  if (!record(value)) throw new ValidationError("Pesanan harus berupa objek.");
  const {
    id,
    businessId,
    customerId,
    quantity,
    deadline,
    slack,
    compensation,
    value: price,
    margin,
    cancellationPenalty,
  } = value;
  if (
    typeof id !== "string" ||
    id.length > 80 ||
    !(manual ? /^M-[a-zA-Z0-9-]+$/ : /^[a-zA-Z0-9-]+$/).test(id) ||
    !data.businesses.some((b) => b.id === businessId) ||
    !data.customers.some((c) => c.id === customerId)
  )
    throw new ValidationError(
      "Identitas pesanan, usaha, atau pelanggan tidak valid.",
    );
  if (
    !integer(quantity, 1, 100000) ||
    !integer(deadline, 0, 10) ||
    !integer(slack, 0, 3) ||
    deadline + slack > 13
  )
    throw new ValidationError(
      "Jumlah harus 1–100.000 lembar, tenggat maksimal hari ke-11, dan kelonggaran 0–3 hari.",
    );
  if (
    !integer(price) ||
    !integer(margin) ||
    margin > price ||
    !integer(compensation) ||
    !integer(cancellationPenalty)
  )
    throw new ValidationError(
      "Nilai uang harus bilangan bulat nonnegatif; margin tidak boleh melebihi nilai pesanan.",
    );
  if (!manual && value.status !== "aktif" && value.status !== "selesai")
    throw new ValidationError("Status pesanan tidak valid.");
  return {
    id,
    businessId: businessId as string,
    customerId: customerId as string,
    quantity,
    deadline,
    slack,
    compensation,
    value: price,
    margin,
    cancellationPenalty,
    status: manual ? "aktif" : (value.status as Order["status"]),
  };
}
export function parseDataset(value: unknown): Dataset {
  if (
    !record(value) ||
    !Array.isArray(value.businesses) ||
    value.businesses.length !== 3 ||
    !Array.isArray(value.customers) ||
    !Array.isArray(value.orders) ||
    !Array.isArray(value.disruptions)
  )
    throw new ValidationError("Struktur data lokal tidak valid.");
  const businesses = value.businesses.map((b) => {
    if (
      !record(b) ||
      typeof b.id !== "string" ||
      typeof b.name !== "string" ||
      !integer(b.capacity, 1, 100000) ||
      !integer(b.unitCost) ||
      typeof b.quality !== "number" ||
      !Number.isFinite(b.quality) ||
      b.quality < 1 ||
      b.quality > 5 ||
      !record(b.distances) ||
      Object.values(b.distances).some(
        (d) => typeof d !== "number" || !Number.isFinite(d) || d < 0,
      )
    )
      throw new ValidationError("Data usaha tidak valid.");
    return {
      id: b.id,
      name: b.name,
      capacity: b.capacity,
      unitCost: b.unitCost,
      quality: b.quality,
      distances: b.distances as Record<string, number>,
    };
  });
  const customers = value.customers.map((c) => {
    if (!record(c) || typeof c.id !== "string" || typeof c.name !== "string")
      throw new ValidationError("Data pelanggan tidak valid.");
    return { id: c.id, name: c.name };
  });
  if (
    new Set(businesses.map((b) => b.id)).size !== businesses.length ||
    new Set(customers.map((c) => c.id)).size !== customers.length
  )
    throw new ValidationError("Identitas usaha atau pelanggan duplikat.");
  if (
    businesses.some((b) =>
      businesses.some(
        (other) => other.id !== b.id && b.distances[other.id] === undefined,
      ),
    )
  )
    throw new ValidationError("Jarak antarusaha belum lengkap.");
  const orders = value.orders.map((o) =>
    parseOrder(o, { businesses, customers }, false),
  );
  if (new Set(orders.map((o) => o.id)).size !== orders.length)
    throw new ValidationError("Identitas pesanan duplikat.");
  const disruptions = value.disruptions.map((d) => {
    if (
      !record(d) ||
      typeof d.id !== "string" ||
      !businesses.some((b) => b.id === d.businessId) ||
      !integer(d.start, 0, 13) ||
      !integer(d.duration, 1, 14) ||
      !integer(d.loss, 0, 100)
    )
      throw new ValidationError("Data gangguan tidak valid.");
    return {
      id: d.id,
      businessId: d.businessId as string,
      start: d.start,
      duration: d.duration,
      loss: d.loss,
    };
  });
  return { businesses, customers, orders, disruptions };
}
