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

const newRoundButton = (page: Page) =>
  page.getByRole("button", { name: "Nova rodada" });

test("cenário 1: rodada com título vai ao histórico para todos e a nova começa zerada", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");

  await fac.getByLabel("Título da rodada").fill("Login com Google");
  await fac.getByRole("button", { name: "Salvar título" }).click();
  await expect(ana.getByText("Login com Google")).toBeVisible();
  await vote(ana, "5");
  await fac.getByRole("button", { name: "Revelar cartas" }).click();
  await newRoundButton(fac).click();

  for (const page of [fac, ana]) {
    const history = page.getByRole("region", { name: "Histórico" });
    await expect(history.getByText("Login com Google")).toBeVisible();
    await expect(history.getByText(/Mediana: 5/)).toBeVisible();
    await expect(history.getByText(/Moda: Sem moda/)).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: "Cartas" }).getByRole("radio", {
        checked: true,
      }),
    ).toHaveCount(0);
  }
});

test('cenário 2: rodada sem título aparece como "Rodada N" no histórico', async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");

  for (const card of ["3", "8"]) {
    await vote(ana, card);
    await fac.getByRole("button", { name: "Revelar cartas" }).click();
    await newRoundButton(fac).click();
  }
  await vote(ana, "2");
  await fac.getByRole("button", { name: "Revelar cartas" }).click();
  await newRoundButton(fac).click();

  const history = ana.getByRole("region", { name: "Histórico" });
  const items = history.getByRole("listitem");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("Rodada 3");
  await expect(items.nth(0)).toContainText("Mediana: 2");
  await expect(items.nth(2)).toContainText("Rodada 1");
});

test('cenário 3: sem revelação o botão "Nova rodada" fica desabilitado', async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");

  await expect(newRoundButton(fac)).toBeDisabled();
  await vote(ana, "5");
  await expect(newRoundButton(fac)).toBeDisabled();
  await fac.getByRole("button", { name: "Revelar cartas" }).click();
  await expect(newRoundButton(fac)).toBeEnabled();
});
