import { expect, test } from "@playwright/test";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("cria a sala e leva o criador à sala como facilitador", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Nome da sala").fill("Sprint 42 - Checkout");
  await page.getByLabel("Baralho").selectOption("points");
  await page.getByLabel("Seu nome").fill("Ana");
  await page.getByRole("radio", { name: "Raposa" }).click();
  await page.getByRole("button", { name: "Criar sala" }).click();

  await expect(page).toHaveURL(/\/r\/[0-9A-Za-z]{22}$/);
  await expect(
    page.getByRole("heading", { name: "Sprint 42 - Checkout" }),
  ).toBeVisible();
  await expect(page.getByText("Ana", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Raposa" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByText("Link copiado")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(page.url());
});

test("exibe o campo obrigatório e não cria a sala quando nome da sala ou do facilitador está em branco", async ({
  page,
}) => {
  let posts = 0;
  await page.route("**/api/rooms", (route) => {
    if (route.request().method() === "POST") posts++;
    return route.continue();
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Criar sala" }).click();
  await expect(page.getByText("Informe o nome da sala")).toBeVisible();
  await expect(page.getByText("Informe seu nome")).toBeVisible();

  await page.getByLabel("Nome da sala").fill("Sprint 42");
  await page.getByRole("button", { name: "Criar sala" }).click();
  await expect(page.getByText("Informe seu nome")).toBeVisible();

  await expect(page).toHaveURL(/\/$/);
  expect(posts).toBe(0);
});
