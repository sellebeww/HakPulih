import type { Business, Dataset } from "./types";
export const BASE_DATE = "2026-10-19";
export function seed(): Dataset {
  const businesses: Business[] = [
    {
      id: "A",
      name: "Aksara Print",
      capacity: 3000,
      unitCost: 260,
      quality: 5,
      distances: { B: 4, C: 9 },
    },
    {
      id: "B",
      name: "Bina Grafika",
      capacity: 2500,
      unitCost: 240,
      quality: 4.8,
      distances: { A: 4, C: 6 },
    },
    {
      id: "C",
      name: "Citra Cetak",
      capacity: 2000,
      unitCost: 210,
      quality: 3.5,
      distances: { A: 9, B: 6 },
    },
  ];
  const names = [
    "Kopi Selatan",
    "Studio Rupa",
    "Toko Melati",
    "Ruang Belajar",
    "Pasar Kreatif",
    "Dapur Nusa",
    "Klinik Sehat",
    "Festival Kota",
    "Kedai Senja",
    "Bumi Organik",
    "Taman Baca",
    "Roti Pagi",
  ];
  const customers = names.map((name, i) => ({ id: `P${i + 1}`, name }));
  const orders = businesses.flatMap((b, bi) =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `${b.id}-${String(i + 1).padStart(2, "0")}`,
      customerId: customers[(i + bi * 3) % 12].id,
      businessId: b.id,
      quantity:
        i < 3
          ? b.id === "A"
            ? 2000
            : b.id === "B"
              ? 2000
              : 1500
          : 1000 + (i % 2) * 500,
      deadline: i < 3 ? i : 4 + Math.floor((i - 3) / 2),
      slack:
        b.id === "A" ? (i % 3 === 0 ? 2 : 0) : i < 3 ? 3 : i % 2 === 0 ? 2 : 0,
      compensation: 20000 + (i % 3) * 10000,
      value: 1600000,
      margin: 700000,
      cancellationPenalty: 400000,
      status: "aktif" as const,
    })),
  );
  return { businesses, customers, orders, disruptions: [] };
}
export const SCENARIOS = [
  {
    id: "S1",
    name: "Mesin A rusak",
    description: "Kapasitas A hilang selama 3 hari.",
  },
  {
    id: "S2",
    name: "Gangguan bersamaan",
    description: "A dan B terganggu; C menjadi tumpuan.",
  },
  {
    id: "S3",
    name: "Kompensasi mahal",
    description: "Tarif penundaan Rp2 juta per hari.",
  },
  {
    id: "S4",
    name: "Mutu menentukan",
    description: "Penalti mutu tinggi mengubah kelayakan tujuan.",
  },
];
export function scenario(id: string, base = seed()): Dataset {
  const data = structuredClone(base);
  data.disruptions = [
    { id: "G-A", businessId: "A", start: 0, duration: 3, loss: 100 },
  ];
  if (id === "S2")
    data.disruptions.push({
      id: "G-B",
      businessId: "B",
      start: 0,
      duration: 2,
      loss: 80,
    });
  if (id === "S3")
    data.orders.forEach((o) => {
      if (o.slack) o.compensation = 2000000;
    });
  return data;
}
