import { expect, test } from "@playwright/test";

const BASE62 = /^[0-9A-Za-z]{22}$/;
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ROOM_NAME = "[smoke] verificação de deploy";

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(22));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function wsUrl(baseURL: string, roomId: string): string {
  const url = new URL(`/api/rooms/${roomId}/ws`, baseURL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

test.describe.configure({ timeout: 30_000 });

test("GET / responde 200 e exibe a tela inicial", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Pokerfé" })).toBeVisible();
});

test("POST /api/rooms cria a sala e o WebSocket recebe room_state", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/rooms", {
    data: { name: ROOM_NAME, deckType: "points" },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as {
    roomId: string;
    facilitatorToken: string;
  };
  expect(body.roomId).toMatch(BASE62);
  expect(body.facilitatorToken).toMatch(BASE62);

  const roomName = await new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(wsUrl(baseURL!, body.roomId));
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("room_state não recebido"));
    }, 15_000);
    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "join",
          sessionId: randomId(),
          displayName: "Smoke",
          avatarId: null,
          facilitatorToken: body.facilitatorToken,
        }),
      );
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as {
        type: string;
        room?: { name: string };
      };
      if (message.type === "room_state") {
        clearTimeout(timer);
        socket.close();
        resolve(message.room!.name);
      }
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("falha na conexão WebSocket"));
    });
  });
  expect(roomName).toBe(ROOM_NAME);
});

test("sala inexistente com roomId válido fecha a conexão com 4404", async ({
  baseURL,
}) => {
  const code = await new Promise<number>((resolve, reject) => {
    const socket = new WebSocket(wsUrl(baseURL!, randomId()));
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("fechamento não recebido"));
    }, 15_000);
    // Em dev o fechamento só chega após o cliente enviar algo (como o app faz).
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "probe" }));
    });
    socket.addEventListener("close", (event) => {
      clearTimeout(timer);
      resolve(event.code);
    });
  });
  expect(code).toBe(4404);
});
