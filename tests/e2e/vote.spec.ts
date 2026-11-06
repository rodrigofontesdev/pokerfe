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

test("votante escolhe uma carta e troca antes da revelação", async ({
  browser,
}) => {
  const { page: facilitator, url } = await createRoom(browser);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await page.getByLabel("Seu nome").fill("Ana");
  await page.getByRole("button", { name: "Entrar" }).click();

  const deck = page.getByRole("radiogroup", { name: "Cartas" });
  await deck.getByRole("radio", { name: "5", exact: true }).click();
  await expect(
    deck.getByRole("radio", { name: "5", exact: true }),
  ).toBeChecked();
  await expect(
    facilitator
      .getByRole("listitem")
      .filter({ hasText: "Ana" })
      .getByText("Votou"),
  ).toBeVisible();

  await deck.getByRole("radio", { name: "8", exact: true }).click();
  await expect(
    deck.getByRole("radio", { name: "8", exact: true }),
  ).toBeChecked();
  await expect(
    deck.getByRole("radio", { name: "5", exact: true }),
  ).not.toBeChecked();
});

test("facilitador não tem cartas para escolher", async ({ browser }) => {
  const { page: facilitator } = await createRoom(browser);
  await expect(
    facilitator.getByRole("heading", { name: "Sprint 42" }),
  ).toBeVisible();
  await expect(
    facilitator.getByRole("radiogroup", { name: "Cartas" }),
  ).toHaveCount(0);
});
