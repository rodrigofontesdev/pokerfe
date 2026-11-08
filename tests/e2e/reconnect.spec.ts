import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type WebSocketRoute,
} from "@playwright/test";

/**
 * O Chromium não derruba WebSockets já abertos com `setOffline(true)` e as
 * conexões interceptadas saem pelo Node, fora da emulação de rede. Por isso as
 * conexões são roteadas: offline, as abertas são fechadas e as novas falham.
 */
const net = new WeakMap<
  BrowserContext,
  {
    offline: boolean;
    routes: { page: WebSocketRoute; server: WebSocketRoute }[];
  }
>();

async function trackSockets(context: BrowserContext) {
  const state = {
    offline: false,
    routes: [] as { page: WebSocketRoute; server: WebSocketRoute }[],
  };
  net.set(context, state);
  await context.routeWebSocket(/\/ws$/, (ws) => {
    if (state.offline) {
      void ws.close({ code: 1001 });
      return;
    }
    state.routes.push({ page: ws, server: ws.connectToServer() });
  });
}

async function goOffline(context: BrowserContext) {
  const state = net.get(context)!;
  state.offline = true;
  await context.setOffline(true);
  for (const { page, server } of state.routes) {
    await server.close();
    await page.close({ code: 1001 });
  }
  state.routes = [];
}

async function goOnline(context: BrowserContext) {
  net.get(context)!.offline = false;
  await context.setOffline(false);
}

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
  await trackSockets(context);
  const page = await context.newPage();
  await page.goto(url);
  await page.getByLabel("Seu nome").fill(name);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("radiogroup", { name: "Cartas" })).toBeVisible();
  return { page, context };
}

const card = (page: Page, label: string) =>
  page
    .getByRole("radiogroup", { name: "Cartas" })
    .getByRole("radio", { name: label, exact: true });

const banner = (page: Page) => page.getByText("Conexão perdida. Reconectando…");

test("volta com nome, avatar e voto 5 em até 5 s", async ({ browser }) => {
  const { page: facilitator, url } = await createRoom(browser);
  const { page, context } = await joinAs(browser, url, "Ana");
  await card(page, "5").click();
  await expect(card(page, "5")).toBeChecked();

  await goOffline(context);
  await expect(banner(page)).toBeVisible();
  await expect(
    facilitator.getByRole("listitem").filter({ hasText: "Ana" }),
  ).toContainText("Desconectado");

  await goOnline(context);
  await expect(banner(page)).toBeHidden({ timeout: 5000 });
  await expect(page.getByText("Ana", { exact: true })).toBeVisible();
  await expect(card(page, "5")).toBeChecked();
});

test("após reconectar em votação, troca a carta", async ({ browser }) => {
  const { url } = await createRoom(browser);
  const { page, context } = await joinAs(browser, url, "Ana");
  await card(page, "5").click();

  await goOffline(context);
  await expect(banner(page)).toBeVisible();
  await goOnline(context);
  await expect(banner(page)).toBeHidden({ timeout: 5000 });

  await card(page, "8").click();
  await expect(card(page, "8")).toBeChecked();
  await expect(card(page, "5")).not.toBeChecked();
});

test("revelação durante a queda aparece ao reconectar", async ({ browser }) => {
  const { page: facilitator, url } = await createRoom(browser);
  const { page, context } = await joinAs(browser, url, "Ana");
  const bia = await joinAs(browser, url, "Bia");
  await card(page, "5").click();
  await expect(card(page, "5")).toBeChecked();
  await card(bia.page, "3").click();
  await expect(card(bia.page, "3")).toBeChecked();

  await goOffline(context);
  await expect(banner(page)).toBeVisible();
  await expect(
    facilitator.getByRole("listitem").filter({ hasText: "Ana" }),
  ).toContainText("Desconectado");
  await facilitator.getByRole("button", { name: "Revelar" }).click();
  await expect(facilitator.getByText("Mediana")).toBeVisible();

  await goOnline(context);
  await expect(page.getByText("Mediana")).toBeVisible({ timeout: 5000 });
  await expect(banner(page)).toBeHidden();

  await facilitator.getByRole("button", { name: "Nova rodada" }).click();
  await expect(card(page, "5")).not.toBeChecked();
});
