import { generateId, isValidId } from "@shared/ids.ts";
import { sha256Hex } from "../room/hash.ts";
import {
  createRoomRequestSchema,
  type CreateRoomResponse,
  type HttpError,
} from "@shared/protocol.ts";

export { Room } from "../room/Room";

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  const body: HttpError = { error: { code, message } };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

const WS_PATH = /^\/api\/rooms\/([^/]+)\/ws$/;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname !== "/api" && !pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    const ws = WS_PATH.exec(pathname);
    if (ws) {
      if (request.method !== "GET") {
        return errorResponse(
          405,
          "method_not_allowed",
          "Método não permitido",
          {
            Allow: "GET",
          },
        );
      }
      const roomId = ws[1]!;
      if (!isValidId(roomId)) {
        return errorResponse(400, "invalid_room_id", "ID de sala inválido");
      }
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return errorResponse(
          426,
          "upgrade_required",
          "Requer upgrade para WebSocket",
        );
      }
      return env.ROOM.get(env.ROOM.idFromName(roomId)).fetch(request);
    }

    if (pathname === "/api/rooms" && request.method !== "POST") {
      return errorResponse(405, "method_not_allowed", "Método não permitido", {
        Allow: "POST",
      });
    }

    if (pathname === "/api/rooms") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, "invalid_request", "Corpo inválido");
      }
      const parsed = createRoomRequestSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          400,
          "invalid_request",
          "Informe um nome de sala (1 a 250 caracteres) e um baralho válido",
        );
      }
      const roomId = generateId();
      const facilitatorToken = generateId();
      await env.ROOM.get(env.ROOM.idFromName(roomId)).initialize({
        name: parsed.data.name,
        deckType: parsed.data.deckType,
        facilitatorTokenHash: await sha256Hex(facilitatorToken),
      });
      const result: CreateRoomResponse = { roomId, facilitatorToken };
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    return errorResponse(404, "not_found", "Rota não encontrada");
  },
} satisfies ExportedHandler<Env>;
