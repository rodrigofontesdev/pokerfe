import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

// SC-005: cartas navegáveis por teclado e contraste mínimo AA.

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

/** Foco visível: o elemento focado tem outline ou box-shadow (anel do Tailwind). */
async function expectVisibleFocus(page: Page) {
  const visible = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    const outline =
      style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    const shadow = style.boxShadow !== "none" && style.boxShadow !== "";
    return outline || shadow;
  });
  expect(visible).toBe(true);
}

/** Alcança o elemento só com Tab, como um usuário de teclado. */
async function tabTo(page: Page, target: Locator) {
  await page.locator("body").click({ position: { x: 0, y: 0 } });
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Elemento não alcançável por Tab");
}

/** Menores contrastes (WCAG 2.x) entre texto e fundo de todos os textos visíveis. */
async function lowContrast(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    type Rgba = [number, number, number, number];
    const parse = (css: string): Rgba => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: Rgba, bottom: Rgba): Rgba => {
      const a = top[3] + bottom[3] * (1 - top[3]);
      if (a === 0) return [255, 255, 255, 0];
      const mix = (i: 0 | 1 | 2) =>
        (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a;
      return [mix(0), mix(1), mix(2), a];
    };
    const lum = ([r, g, b]: Rgba) => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: Rgba, b: Rgba) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const opacityOf = (el: Element) => {
      let o = 1;
      for (let n: Element | null = el; n; n = n.parentElement)
        o *= parseFloat(getComputedStyle(n).opacity);
      return o;
    };
    const backgroundOf = (el: Element): Rgba => {
      let bg: Rgba = [255, 255, 255, 1];
      const chain: Element[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) chain.push(n);
      for (const n of chain.reverse()) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c[3] > 0) bg = over(c, bg);
      }
      return bg;
    };

    const failures: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !el || el.closest("script,style")) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (el.closest(":disabled")) continue; // componentes inativos são isentos (WCAG 1.4.3)
      const bg = backgroundOf(el);
      const fg = over(
        [
          ...parse(style.color).slice(0, 3),
          parse(style.color)[3] * opacityOf(el),
        ] as Rgba,
        bg,
      );
      const size = parseFloat(style.fontSize);
      const bold = parseInt(style.fontWeight, 10) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const min = large ? 3 : 4.5;
      const r = ratio(fg, bg);
      if (r < min)
        failures.push(`"${text}" ${r.toFixed(2)}:1 (mínimo ${min}:1)`);
    }
    return failures;
  });
}

test("votante escolhe a carta só com o teclado e o foco é visível", async ({
  browser,
}) => {
  const { url } = await createRoom(browser);
  const page = await joinAs(browser, url, "Ana");
  const deck = page.getByRole("radiogroup", { name: "Cartas" });

  await tabTo(page, deck.getByRole("radio").first());
  await expect(deck.getByRole("radio").first()).toBeFocused();
  await expectVisibleFocus(page);

  await page.keyboard.press("ArrowRight");
  await expect(deck.getByRole("radio").nth(1)).toBeFocused();
  await expectVisibleFocus(page);
  await page.keyboard.press("Space");
  await expect(deck.getByRole("radio").nth(1)).toBeChecked();

  await page.keyboard.press("ArrowRight");
  await expect(deck.getByRole("radio").nth(2)).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(deck.getByRole("radio").nth(1)).toBeChecked();
});

test("ações do facilitador são alcançáveis e acionáveis pelo teclado", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");
  await ana
    .getByRole("radiogroup", { name: "Cartas" })
    .getByRole("radio", { name: "5", exact: true })
    .click();

  const reveal = fac.getByRole("button", { name: "Revelar cartas" });
  await expect(reveal).toBeEnabled();
  await tabTo(fac, reveal);
  await expect(reveal).toBeFocused();
  await expectVisibleFocus(fac);
  await fac.keyboard.press("Enter");
  await expect(fac.getByText("Cartas reveladas")).toBeVisible();

  const newRound = fac.getByRole("button", { name: "Nova rodada" });
  await tabTo(fac, newRound);
  await expectVisibleFocus(fac);
  await fac.keyboard.press("Enter");
  await expect(fac.getByText("Cartas reveladas")).toHaveCount(0);

  const observer = fac
    .getByRole("listitem")
    .filter({ hasText: "Ana" })
    .getByRole("button", { name: "Marcar como observador" });
  await tabTo(fac, observer);
  await expectVisibleFocus(fac);
  await fac.keyboard.press("Enter");
  await expect(
    fac
      .getByRole("listitem")
      .filter({ hasText: "Ana" })
      .getByRole("button", { name: "Marcar como votante" }),
  ).toBeVisible();
});

test("campos do formulário inicial têm foco visível na ordem de tabulação", async ({
  page,
}) => {
  await page.goto("/");
  await tabTo(page, page.getByLabel("Nome da sala"));
  await tabTo(page, page.getByLabel("Seu nome"));
  await tabTo(page, page.getByRole("button", { name: "Criar sala" }));
  await expectVisibleFocus(page);
});

test("contraste de texto atende AA nas telas principais", async ({
  browser,
}) => {
  const { page: fac, url } = await createRoom(browser);
  const ana = await joinAs(browser, url, "Ana");

  const home = await (await browser.newContext()).newPage();
  await home.goto("/");
  expect(await lowContrast(home)).toEqual([]);

  await expect(fac.getByRole("heading", { name: "Sprint 42" })).toBeVisible();
  expect(await lowContrast(fac)).toEqual([]);
  expect(await lowContrast(ana)).toEqual([]);

  await ana
    .getByRole("radiogroup", { name: "Cartas" })
    .getByRole("radio", { name: "5", exact: true })
    .click();
  await fac.getByRole("button", { name: "Revelar cartas" }).click();
  await expect(fac.getByText("Cartas reveladas")).toBeVisible();
  expect(await lowContrast(fac)).toEqual([]);

  await fac.getByRole("button", { name: "Nova rodada" }).click();
  await expect(fac.getByText("Cartas reveladas")).toHaveCount(0);
  expect(await lowContrast(fac)).toEqual([]);

  await ana.context().close();
  await expect(fac.getByText("Desconectado")).toBeVisible();
  expect(await lowContrast(fac)).toEqual([]);
});
