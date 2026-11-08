import { expect, test, type Browser } from "@playwright/test";

const ENGLISH =
  /\b(the|and|please|room|name|enter|join|vote|reveal|error|invalid|required|failed|cancel|submit|save|loading|connected|disconnected|waiting|participants?|history|round|share|copy|credits|back)\b/i;

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

/** Texto visível + atributos acessíveis (aria-label, alt, title, placeholder). */
async function visibleStrings(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim();
      if (t) out.push(t);
    }
    for (const el of document.querySelectorAll(
      "[aria-label],[alt],[title],[placeholder]",
    )) {
      for (const a of ["aria-label", "alt", "title", "placeholder"]) {
        const v = el.getAttribute(a)?.trim();
        if (v) out.push(v);
      }
    }
    return out;
  });
}

function expectOnlyPortuguese(strings: string[], allowed: string[] = []) {
  const offenders = strings.filter(
    (s) => !allowed.includes(s) && ENGLISH.test(s) && !/[ãõçáéíóúâêô]/i.test(s),
  );
  // Palavras que existem nos dois idiomas não contam: "Sala" etc. não casam com o filtro.
  expect(offenders).toEqual([]);
}

test("html declara pt-BR e título está em português", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
});

test("telas inicial, sala, facilitador, rodada revelada e inexistente só têm pt-BR", async ({
  browser,
}) => {
  const home = await (await browser.newContext()).newPage();
  await home.goto("/");
  await home.getByRole("button", { name: "Criar sala" }).click();
  await expect(home.getByText("Informe o nome da sala")).toBeVisible();
  expectOnlyPortuguese(await visibleStrings(home));

  const { page: fac, url } = await createRoom(browser);
  const ana = await (await browser.newContext()).newPage();
  await ana.goto(url);
  await ana.getByRole("button", { name: "Entrar" }).click();
  await expect(ana.getByText("Informe seu nome")).toBeVisible();
  expectOnlyPortuguese(await visibleStrings(ana));

  await ana.getByLabel("Seu nome").fill("Ana");
  await ana.getByRole("button", { name: "Entrar" }).click();
  await ana
    .getByRole("radiogroup", { name: "Cartas" })
    .getByRole("radio", { name: "5", exact: true })
    .click();
  await expect(fac.getByText("Votou")).toBeVisible();
  expectOnlyPortuguese(await visibleStrings(fac));
  expectOnlyPortuguese(await visibleStrings(ana));

  await fac.getByRole("button", { name: "Revelar cartas" }).click();
  await expect(fac.getByText("Cartas reveladas")).toBeVisible();
  expectOnlyPortuguese(await visibleStrings(fac));
  await fac.getByRole("button", { name: "Nova rodada" }).click();
  await expect(fac.getByText("Cartas reveladas")).toHaveCount(0);
  expectOnlyPortuguese(await visibleStrings(fac));

  const missing = await (await browser.newContext()).newPage();
  await missing.goto("/r/inexistente");
  await expect(
    missing.getByRole("heading", { name: "Sala não encontrada ou expirada" }),
  ).toBeVisible();
  expectOnlyPortuguese(await visibleStrings(missing));
});

test("mensagens de erro do servidor chegam em pt-BR", async ({ browser }) => {
  const { page, url } = await createRoom(browser);
  const roomId = new URL(url).pathname.split("/").pop()!;
  const errors = await page.evaluate(async (id) => {
    const open = () =>
      new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(
          `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/rooms/${id}/ws`,
        );
        ws.onopen = () => resolve(ws);
        ws.onerror = () => reject(new Error("ws"));
      });
    const ask = (payload: unknown) =>
      open().then(
        (ws) =>
          new Promise<{ code: string; message: string }>((resolve) => {
            ws.onmessage = (e) => {
              const data = JSON.parse(String(e.data));
              if (data.type === "error") {
                ws.close();
                resolve(data);
              }
            };
            ws.send(
              typeof payload === "string" ? payload : JSON.stringify(payload),
            );
          }),
      );
    const sessionId = "a".repeat(22);
    return [
      await ask({
        type: "join",
        sessionId,
        displayName: "x".repeat(46),
        avatarId: null,
      }),
      await ask({ type: "vote", card: "5" }),
      await ask("não é json"),
      await ask({ type: "desconhecido" }),
    ];
  }, roomId);
  expect(errors.map((e) => e.code)).toEqual([
    "validation_error",
    "not_joined",
    "invalid_message",
    "invalid_message",
  ]);
  for (const e of errors) expect(e.message).not.toMatch(ENGLISH);
});
