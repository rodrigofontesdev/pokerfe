import { expect, test, type Browser, type Page } from "@playwright/test";

const PARTICIPANTS = 10;
const VOTE_LATENCY_MS = 500;

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

const card = (page: Page, value: string) =>
  page
    .getByRole("radiogroup", { name: "Cartas" })
    .getByRole("radio", { name: value, exact: true });

test("10 participantes votam, revelam e começam nova rodada sem erro", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  const watch = (page: Page) => {
    page.on("pageerror", (error) => errors.push(error.message));
  };

  const { page: facilitator, url } = await createRoom(browser);
  watch(facilitator);
  const voters = await Promise.all(
    Array.from({ length: PARTICIPANTS - 1 }, (_, i) =>
      joinAs(browser, url, `Pessoa ${i + 1}`),
    ),
  );
  voters.forEach(watch);
  const everyone = [facilitator, ...voters];
  for (const page of everyone) {
    await expect(
      page.getByRole("heading", { name: `Participantes (${PARTICIPANTS})` }),
    ).toBeVisible();
  }

  // SC-001: mede, no relógio da própria máquina, do clique de quem vota até o
  // "Votou" aparecer na tela dos demais (todas as páginas rodam na mesma máquina).
  const sender = voters[0]!;
  const watchers = [facilitator, ...voters.slice(1)];
  await Promise.all(
    watchers.map((page) =>
      page.evaluate(() => {
        const w = window as unknown as { __votedAt?: number };
        const seen = () =>
          [...document.querySelectorAll("li")].some(
            (li) =>
              li.textContent?.includes("Pessoa 1") &&
              li.textContent.includes("Votou"),
          );
        const observer = new MutationObserver(() => {
          if (w.__votedAt === undefined && seen()) {
            w.__votedAt = Date.now();
            observer.disconnect();
          }
        });
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      }),
    ),
  );
  await sender.evaluate(() => {
    const w = window as unknown as { __sentAt?: number };
    document.addEventListener("click", () => (w.__sentAt = Date.now()), {
      capture: true,
      once: true,
    });
  });
  await card(sender, "5").click();
  const sentAt = await sender.evaluate(
    () => (window as unknown as { __sentAt: number }).__sentAt,
  );
  const latencies = await Promise.all(
    watchers.map(async (page) => {
      await page.waitForFunction(
        () =>
          (window as unknown as { __votedAt?: number }).__votedAt !== undefined,
      );
      const votedAt = await page.evaluate(
        () => (window as unknown as { __votedAt: number }).__votedAt,
      );
      return votedAt - sentAt;
    }),
  );
  expect(Math.max(...latencies)).toBeLessThan(VOTE_LATENCY_MS);

  // Rodada completa: todos os demais votam, o facilitador revela e abre nova rodada.
  await Promise.all(
    voters
      .slice(1)
      .map((page, i) => card(page, i % 2 === 0 ? "3" : "8").click()),
  );
  const reveal = facilitator.getByRole("button", { name: "Revelar cartas" });
  await expect(reveal).toBeEnabled();
  await reveal.click();
  for (const page of everyone) {
    await expect(page.getByText("Cartas reveladas")).toBeVisible();
    await expect(page.getByLabel("Voto de Pessoa 1: 5")).toBeVisible();
  }

  await facilitator.getByRole("button", { name: "Nova rodada" }).click();
  for (const page of everyone) {
    await expect(page.getByText("Cartas reveladas")).toHaveCount(0);
  }
  for (const page of voters) {
    await expect(card(page, "5")).not.toBeChecked();
  }
  expect(errors).toEqual([]);
});
