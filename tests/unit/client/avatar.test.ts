import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar } from "@client/components/Avatar.tsx";
import { AvatarPicker } from "@client/components/AvatarPicker.tsx";

describe("Avatar", () => {
  it('sem avatar, exibe a letra "A" para o nome "Ana"', () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { avatarId: null, displayName: "Ana" }),
    );
    expect(html).toContain(">A<");
    expect(html).not.toContain("<img");
  });

  it("com avatar da lista, exibe a imagem com o nome do animal", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { avatarId: "fox", displayName: "Ana" }),
    );
    expect(html).toContain("<img");
    expect(html).toContain('alt="Raposa"');
  });

  it("avatarId desconhecido cai no placeholder", () => {
    const html = renderToStaticMarkup(
      createElement(Avatar, { avatarId: "dragon", displayName: "bia" }),
    );
    expect(html).toContain(">B<");
  });
});

describe("AvatarPicker", () => {
  it("renderiza 'Sem avatar' e os 12 animais em ordem alfabética", () => {
    const html = renderToStaticMarkup(
      createElement(AvatarPicker, {
        value: null,
        onChange: () => {},
        displayName: "Ana",
      }),
    );
    const labels = [...html.matchAll(/role="radio"[^>]*aria-label="([^"]+)"/g)]
      .map((m) => m[1])
      .concat(
        [...html.matchAll(/aria-label="([^"]+)"[^>]*role="radio"/g)].map(
          (m) => m[1],
        ),
      );
    expect(labels.length).toBe(13);
    expect(labels[0]).toBe("Sem avatar");
    expect(labels[1]).toBe("Águia");
    expect(labels[12]).toBe("Tigre");
  });
});
