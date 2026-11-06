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

const revealButton = (page: Page) =>
  page.getByRole("button", { name: "Revelar cartas" });

test("botão desabilitado mostra quantos votos faltam; cartas só aparecem ao revelar", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");
  const caio = await joinAs(browser, url, "Caio");

  await expect(revealButton(fac)).toBeDisabled();
  await expect(fac.getByText("Faltam 2 votos")).toBeVisible();

  await vote(ana, "5");
  await expect(fac.getByText("Falta 1 voto")).toBeVisible();
  await vote(caio, "8");

  await expect(revealButton(fac)).toBeEnabled();
  await expect(fac.getByText("Cartas reveladas")).toHaveCount(0);
  await expect(ana.getByText("Cartas reveladas")).toHaveCount(0);

  await revealButton(fac).click();
  for (const page of [fac, ana, caio]) {
    await expect(page.getByText("Cartas reveladas")).toBeVisible();
    await expect(page.getByLabel("Voto de Ana: 5")).toBeVisible();
    await expect(page.getByLabel("Voto de Caio: 8")).toBeVisible();
  }
});

test("só observadores: botão desabilitado; observador presente não impede", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const carlos = await joinAs(browser, url, "Carlos");
  const ana = await joinAs(browser, url, "Ana");

  await fac
    .getByRole("listitem")
    .filter({ hasText: "Carlos" })
    .getByRole("button", { name: "Marcar como observador" })
    .click();
  await fac
    .getByRole("listitem")
    .filter({ hasText: "Ana" })
    .getByRole("button", { name: "Marcar como observador" })
    .click();
  await expect(revealButton(fac)).toBeDisabled();

  await fac
    .getByRole("listitem")
    .filter({ hasText: "Ana" })
    .getByRole("button", { name: "Marcar como votante" })
    .click();
  await vote(ana, "3");
  await expect(revealButton(fac)).toBeEnabled();
  await expect(
    carlos.getByRole("button", { name: "Revelar cartas" }),
  ).toHaveCount(0);
});
