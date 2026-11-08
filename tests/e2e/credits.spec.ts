import { expect, test } from "@playwright/test";

test("tela de Créditos lista 12 atribuições com links seguros", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Créditos" }).click();
  await expect(page).toHaveURL(/\/creditos$/);

  const links = page.locator("main ul a");
  await expect(links).toHaveCount(12);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("Voltar retorna à tela anterior", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Créditos" }).click();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page).toHaveURL(/\/$/);
});
