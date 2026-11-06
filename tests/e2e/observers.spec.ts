import { expect, test, type Browser } from "@playwright/test";

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

const row = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("listitem").filter({ hasText: name });

test("facilitador marca e desmarca observador (cenários 1 a 3)", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const carlos = await joinAs(browser, url, "Carlos");
  const deck = carlos.getByRole("radiogroup", { name: "Cartas" });

  // Cenário 2: voto descartado ao virar observador.
  await deck.getByRole("radio", { name: "5", exact: true }).click();
  await expect(row(fac, "Carlos").getByText("Votou")).toBeVisible();

  // Cenário 1
  await row(fac, "Carlos")
    .getByRole("button", { name: "Marcar como observador" })
    .click();
  await expect(row(fac, "Carlos").getByText("Observador")).toBeVisible();
  await expect(row(carlos, "Carlos").getByText("Observador")).toBeVisible();
  await expect(row(fac, "Carlos").getByText("Votou")).toHaveCount(0);
  await expect(
    deck.getByRole("radio", { name: "5", exact: true }),
  ).toBeDisabled();
  await expect(
    deck.getByRole("radio", { name: "5", exact: true }),
  ).not.toBeChecked();

  // Cenário 3
  await row(fac, "Carlos")
    .getByRole("button", { name: "Marcar como votante" })
    .click();
  await expect(row(fac, "Carlos").getByText("Votante")).toBeVisible();
  await expect(
    deck.getByRole("radio", { name: "5", exact: true }),
  ).toBeEnabled();
});

test("participante comum não vê a opção (cenário 4)", async ({ browser }) => {
  const { url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");
  await expect(row(ana, "Fátima")).toBeVisible();
  await expect(ana.getByRole("button", { name: /Marcar como/ })).toHaveCount(0);
});

test("facilitador não vê a opção na própria linha (cenário 5)", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  await joinAs(browser, url, "Ana");
  await expect(row(fac, "Ana")).toBeVisible();
  await expect(
    row(fac, "Fátima").getByRole("button", { name: /Marcar como/ }),
  ).toHaveCount(0);
  await expect(
    row(fac, "Ana").getByRole("button", { name: "Marcar como observador" }),
  ).toBeVisible();
});
