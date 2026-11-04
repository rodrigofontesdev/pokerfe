import { useEffect, useState } from "react";
import type { RoomState } from "@shared/protocol.ts";
import { createRoomConnection, type ErrorMessage } from "./connection.ts";

export type ConnectionStatus = "connecting" | "open" | "closed";

export function useRoomConnection(roomId: string): {
  roomState: RoomState | null;
  lastError: ErrorMessage | null;
  notFound: boolean;
  status: ConnectionStatus;
} {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [lastError, setLastError] = useState<ErrorMessage | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const connection = createRoomConnection({
      roomId,
      onState: (state) => {
        setRoomState(state);
        setStatus("open");
      },
      onError: setLastError,
      onNotFound: () => setNotFound(true),
      onClose: () => setStatus("closed"),
    });
    return () => connection.close();
  }, [roomId]);

  return { roomState, lastError, notFound, status };
}
