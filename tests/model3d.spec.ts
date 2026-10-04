import { expect, test } from "@playwright/test";
import type { Model3DKind } from "../src/lib/actions";

const models: [Model3DKind, number][] = [["container", 7], ["truck", 6], ["crane", 8], ["ship", 6], ["wagon", 6], ["locomotive", 8], ["locomotive_convoy", 8], ["xmas_tree", 8], ["tank_convoy", 6], ["terminal", 6], ["mri", 7], ["haul_truck", 6]];

for (const [model, count] of models) test(`${model}: assembly, inspection and camera views`, async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/live/token", route => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/accueil");
  await expect(page.getByRole("button", { name: "Ouvrir Lara" })).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir Lara" }).click();
  await expect(page.getByLabel("Question à Lara")).toBeVisible();
  await page.getByRole("button", { name: "Fermer Lara" }).click();

  await page.evaluate(object => window.dispatchEvent(new CustomEvent("agl-action", { detail: { type: "model3d", title: "Equipment test", object, parts: [] } })), model);
  const scene = page.locator(`.x3d[data-model="${model}"]`);
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await expect(scene.locator(".x3d-list li")).toHaveCount(count);
  await expect(scene.getByRole("button", { name: "Décomposer", exact: true })).toHaveAttribute("aria-pressed", "false");
  await scene.locator(".x3d-stage").screenshot({ path: testInfo.outputPath(`${model}.png`) });
  await scene.getByRole("button", { name: "Décomposer", exact: true }).click();
  await expect(scene.getByRole("slider", { name: "Écartement des pièces" })).toBeVisible();
  await scene.locator(".x3d-list button").first().click();
  await expect(scene.locator(".x3d-callout")).toBeVisible();
  await scene.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(scene.getByRole("button", { name: "Profil", exact: true })).toHaveAttribute("aria-pressed", "true");
  await scene.getByRole("button", { name: "Réinitialiser la vue" }).click();
  await expect(scene.getByRole("slider")).toHaveCount(0);
  await expect(scene.locator(".x3d-callout")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("saved project reloads without hydration errors and controls fit a narrow screen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem("agl-project", "sitarail-gl30"));
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/projets");
  await expect(page.getByRole("heading", { name: "Sitarail : quatre locomotives GL30" })).toBeVisible();
  const scene = page.locator('.x3d[data-model="locomotive"]');
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await scene.getByRole("button", { name: "Dessus", exact: true }).click();
  const fits = await scene.evaluate(element => {
    const stage = element.querySelector(".x3d-stage")!.getBoundingClientRect();
    return [...element.querySelectorAll(".x3d-controls button, .x3d-camera-controls button")].every(button => {
      const box = button.getBoundingClientRect();
      return box.left >= stage.left && box.right <= stage.right && box.top >= stage.top && box.bottom <= stage.bottom;
    });
  });
  expect(fits).toBe(true);
  expect(errors).toEqual([]);
});

test("the guided tour can stop while voice is unavailable", async ({ page }) => {
  await page.route("**/api/tts", route => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/projets");
  const scene = page.locator(".x3d");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await scene.getByRole("button", { name: "Visite guidée", exact: true }).click();
  await expect(scene.locator(".x3d-callout")).toBeVisible();
  await scene.getByRole("button", { name: "Arrêter la visite", exact: true }).click();
  await scene.getByRole("button", { name: "Réinitialiser la vue" }).click();
  await expect(scene.getByRole("button", { name: "Décomposer", exact: true })).toBeVisible();
  await expect(scene.locator(".x3d-callout")).toHaveCount(0);
});
