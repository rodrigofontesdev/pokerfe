import { expect, test } from "@playwright/test";

test("recarregar o link de uma sala com rodadas arquivadas mostra o histórico completo", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const fac = await context.newPage();
  await fac.goto("/");
  await fac.getByLabel("Nome da sala").fill("Sprint 42");
  await fac.getByLabel("Seu nome").fill("Fátima");
  await fac.getByRole("button", { name: "Criar sala" }).click();
  await expect(fac).toHaveURL(/\/r\/[0-9A-Za-z]{22}$/);
  const url = fac.url();

  const anaContext = await browser.newContext();
  const ana = await anaContext.newPage();
  await ana.goto(url);
  await ana.getByLabel("Seu nome").fill("Ana");
  await ana.getByRole("button", { name: "Entrar" }).click();
  const cards = ana.getByRole("radiogroup", { name: "Cartas" });
  await expect(cards).toBeVisible();
  for (const card of ["3", "8"]) {
    await cards.getByRole("radio", { name: card, exact: true }).click();
    await fac.getByRole("button", { name: "Revelar cartas" }).click();
    await fac.getByRole("button", { name: "Nova rodada" }).click();
  }

  await fac.reload();
  await expect(fac).toHaveURL(url);

  const history = fac.getByRole("region", { name: "Histórico" });
  const items = history.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Rodada 2");
  await expect(items.nth(0)).toContainText("Mediana: 8");
  await expect(items.nth(1)).toContainText("Rodada 1");
  await expect(items.nth(1)).toContainText("Mediana: 3");
});
