import { expect, test, type Browser, type Page } from "@playwright/test";

async function createRoom(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await page.getByLabel("Nome da sala").fill("Sprint 42");
  await page.getByLabel("Seu nome").fill("Fátima");
  await page.getByRole("button", { name: "Criar sala" }).click();
  await expect(page).toHaveURL(/\/r\/[0-9A-Za-z]{22}$/);
  return { page, url: page.url() };
}

async function joinAs(browser: Browser, url: string, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await page.getByLabel("Seu nome").fill(name);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("radiogroup", { name: "Cartas" })).toBeVisible();
  return page;
}

const vote = (page: Page, card: string) =>
  page
    .getByRole("radiogroup", { name: "Cartas" })
    .getByRole("radio", { name: card, exact: true })
    .click();

test("votos 3, 5, 5 e 8: todos veem mediana 5, moda 5 e distribuição, sem média", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");
  const bia = await joinAs(browser, url, "Bia");
  const caio = await joinAs(browser, url, "Caio");
  const davi = await joinAs(browser, url, "Davi");

  await vote(ana, "3");
  await vote(bia, "5");
  await vote(caio, "5");
  await vote(davi, "8");
  await fac.getByRole("button", { name: "Revelar cartas" }).click();

  for (const page of [fac, ana, bia, caio, davi]) {
    const result = page.getByRole("region", { name: "Resultado" });
    await expect(result.getByText("Mediana")).toBeVisible();
    await expect(
      result
        .locator("dt", { hasText: "Mediana" })
        .locator("xpath=following-sibling::dd"),
    ).toHaveText("5");
    await expect(
      result
        .locator("dt", { hasText: "Moda" })
        .locator("xpath=following-sibling::dd"),
    ).toHaveText("5");
    await expect(result.getByText("3: 1 voto", { exact: true })).toBeVisible();
    await expect(result.getByText("5: 2 votos", { exact: true })).toBeVisible();
    await expect(result.getByText("8: 1 voto", { exact: true })).toBeVisible();
    await expect(page.getByText(/média/i)).toHaveCount(0);
  }
});
