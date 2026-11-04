import { isValidId } from "@shared/ids.ts";
import type { HttpError } from "@shared/protocol.ts";

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

    // POST /api/rooms é implementado na T029.
    return errorResponse(404, "not_found", "Rota não encontrada");
  },
} satisfies ExportedHandler<Env>;
