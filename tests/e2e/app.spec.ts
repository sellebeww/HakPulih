import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request, page }) => {
  await request.post("/api/state", { data: { action: "reset" } });
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Pesanan jaringan" }),
  ).toBeVisible();
});
const navigate = async (page: import("@playwright/test").Page, name: string) =>
  page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
const run = async (page: import("@playwright/test").Page, id: string) => {
  await navigate(page, "Simulator gangguan");
  await page
    .getByRole("button", { name: new RegExp(`SKENARIO ${id}`) })
    .click();
  await expect(page.getByRole("status")).toContainText("Gangguan dijalankan");
};
test("dasbor, pencarian kosong dan navigasi mobile tanpa overflow", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.screenshot({
    path: info.outputPath("desktop.png"),
    fullPage: true,
  });
  await page.getByLabel("Cari pesanan").fill("tidak-ada");
  await expect(
    page.getByText("Tidak ada pesanan yang cocok.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate(page, "Simulator gangguan");
  await expect(
    page.getByRole("heading", { name: "Rancang gangguan sendiri" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("persetujuan, fallback, reload dan status dasbor", async ({ page }) => {
  await run(page, "S1");
  await navigate(page, "Rencana pemulihan");
  await page
    .getByRole("button", { name: /Tolak rencana untuk/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /Rencana #2/ })).toBeVisible();
  await page
    .getByRole("button", { name: /Setujui rencana untuk/ })
    .first()
    .click();
  const remaining = await page
    .getByRole("button", { name: /Setujui rencana untuk/ })
    .count();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Rencana #2/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Setujui rencana untuk/ }),
  ).toHaveCount(remaining);
  while (
    await page.getByRole("button", { name: /Setujui rencana untuk/ }).count()
  )
    await page
      .getByRole("button", { name: /Setujui rencana untuk/ })
      .first()
      .click();
  await page.getByRole("button", { name: /Simpan hasil/ }).click();
  await navigate(page, "Dasbor jaringan");
  await expect(
    page.getByRole("cell", { name: "Dipulihkan", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "Dipulihkan", exact: true }),
  ).toBeVisible();
});
test("pesanan manual tersimpan, reset simulasi tidak menghapus, reset data terkonfirmasi", async ({
  page,
}) => {
  await navigate(page, "Pesanan");
  await page.locator("[name=margin]").fill("2000000");
  await page.getByRole("button", { name: "Simpan pesanan" }).click();
  await expect(page.getByRole("status")).toContainText("margin");
  await page.locator("[name=margin]").fill("400000");
  await page.getByRole("button", { name: "Simpan pesanan" }).click();
  await expect(page.getByRole("status")).toContainText("Data tersimpan");
  await page.reload();
  await expect(page.getByRole("row")).toHaveCount(38);
  await page
    .getByRole("button", { name: "Reset simulasi", exact: true })
    .click();
  await expect(page.getByRole("row")).toHaveCount(38);
  await page
    .getByRole("button", { name: "Reset data contoh", exact: true })
    .click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(38);
  await page
    .getByRole("button", { name: "Reset data contoh", exact: true })
    .click();
  await page.getByRole("button", { name: "Ya, kembalikan seed" }).click();
  await expect(page.getByRole("row")).toHaveCount(37);
});
test("S1–S4, metrik tenggat awal, dan unduh evaluasi", async ({
  page,
}, info) => {
  for (const [id, count] of [
    ["S1", "35"],
    ["S2", "33"],
    ["S3", "34"],
    ["S4", "35"],
  ]) {
    await run(page, id);
    await navigate(page, "Evaluasi dampak");
    const full = page.locator(".evaluation-card.featured");
    await expect(full.locator(".big-metric")).toContainText(`${count} / 36`);
    await expect(full).toContainText("Tepat waktu tenggat awal");
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh evaluasi CSV" }).click();
  expect((await download).suggestedFilename()).toBe("hakpulih-S4-evaluasi.csv");
  await page.screenshot({
    path: info.outputPath("evaluation.png"),
    fullPage: true,
  });
});
test("gagal memuat data dapat dicoba lagi tanpa menampilkan seed sebagai data aktual", async ({
  page,
}) => {
  await page.route("**/api/state", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Gangguan penyimpanan uji" }),
    }),
  );
  await page.reload();
  await expect(page.locator(".load-state").getByRole("heading")).toHaveText(
    "Data belum dapat dimuat",
  );
  await expect(page.locator(".load-state")).toContainText(
    "Gangguan penyimpanan uji",
  );
  await expect(
    page.getByRole("heading", { name: "Pesanan jaringan" }),
  ).toHaveCount(0);
  await page.unroute("**/api/state");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(
    page.getByRole("heading", { name: "Pesanan jaringan" }),
  ).toBeVisible();
});
test("API membatasi asal, format, ukuran dan payload", async ({ request }) => {
  expect(
    (
      await request.post("/api/state", {
        headers: { origin: "https://unrelated.example" },
        data: { action: "reset" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/state", {
        headers: { "content-type": "text/plain" },
        data: "{}",
      })
    ).status(),
  ).toBe(415);
  expect(
    (
      await request.post("/api/state", {
        headers: { "content-type": "application/json" },
        data: "x".repeat(17000),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await request.post("/api/state", {
        data: null,
        headers: { "content-type": "application/json" },
      })
    ).status(),
  ).toBe(400);
});

test("timeout otomatis beralih dan gangguan manual pulih setelah reload", async ({
  page,
}) => {
  await page.clock.install();
  await navigate(page, "Simulator gangguan");
  await page
    .getByRole("button", { name: "Jalankan gangguan", exact: true })
    .click();
  await navigate(page, "Rencana pemulihan");
  await expect(page.getByRole("heading", { name: /Rencana #1/ })).toBeVisible();
  await page.clock.fastForward(121000);
  await expect(page.getByRole("heading", { name: /Rencana #2/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Rencana #2/ })).toBeVisible();
  await navigate(page, "Evaluasi dampak");
  await expect(page.locator(".evaluation-intro")).toContainText(
    "SKENARIO manual",
  );
  await expect(
    page.locator(".evaluation-card.featured .big-metric"),
  ).toContainText("35 / 36");
});
