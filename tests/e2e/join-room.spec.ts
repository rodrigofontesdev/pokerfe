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

test("participante entra pelo link com nome e avatar e todos o veem", async ({
  browser,
}) => {
  const { page: facilitator, url } = await createRoom(browser);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);

  await page.getByLabel("Seu nome").fill("Ana");
  await page.getByRole("radio", { name: "Raposa" }).click();
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Sprint 42" })).toBeVisible();
  // A página do facilitador (Fátima) passa a listar a participante Ana.
  await expect(facilitator.getByText("Fátima", { exact: true })).toBeVisible();
  await expect(facilitator.getByText("Ana", { exact: true })).toBeVisible();
  await expect(
    facilitator.getByRole("img", { name: "Raposa" }).first(),
  ).toBeVisible();
});

test("nome e avatar lembrados vêm preenchidos e podem ser alterados", async ({
  browser,
}) => {
  const { url } = await createRoom(browser);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await page.getByLabel("Seu nome").fill("Ana");
  await page.getByRole("radio", { name: "Raposa" }).click();
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Sprint 42" })).toBeVisible();

  await page.goto(url);
  await expect(page.getByLabel("Seu nome")).toHaveValue("Ana");
  await expect(page.getByRole("radio", { name: "Raposa" })).toBeChecked();
  await page.getByLabel("Seu nome").fill("Ana Maria");
  await page.getByRole("radio", { name: "Tigre" }).click();
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Ana Maria", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Tigre" }).first()).toBeVisible();
});

test("sem avatar escolhido exibe a inicial do nome", async ({ browser }) => {
  const { url } = await createRoom(browser);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await page.getByLabel("Seu nome").fill("Ana");
  await page.getByRole("button", { name: "Entrar" }).click();

  const row = page.getByRole("listitem").filter({ hasText: "Ana" });
  await expect(row.first()).toBeVisible();
  await expect(row.first().getByRole("img")).toHaveCount(0);
  await expect(row.first().getByText("A", { exact: true })).toBeVisible();
});

test("sala inexistente mostra aviso e leva para criar nova sala", async ({
  page,
}) => {
  await page.goto("/r/aB3dE5fG7hI9jK1lM3nO5p");
  await expect(page.getByText("Sala não encontrada ou expirada")).toBeVisible();
  await page.getByRole("link", { name: "Criar nova sala" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/r/invalido");
  await expect(page.getByText("Sala não encontrada ou expirada")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Criar nova sala" }),
  ).toBeVisible();
});
