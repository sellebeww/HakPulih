import { test, expect } from "@playwright/test";
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
] as const) {
  test(`profil perusahaan ${name}: tanpa overflow dan bolak-balik ke aplikasi`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Kapasitas untuk bangkit bersama/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0);
    await page.getByRole("link", { name: /Buka aplikasi/ }).first().click();
    await expect(
      page.getByRole("heading", { name: "Pesanan jaringan" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Profil HakPulih" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
  });
}
