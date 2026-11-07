import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomState } from "@shared/protocol.ts";
import {
  getFacilitatorToken,
  saveProfile,
  type Profile,
} from "@client/storage/local.ts";
import { createRoomConnection, type ErrorMessage } from "./connection.ts";

export type ConnectionStatus = "connecting" | "open" | "closed";

export function useRoomConnection(roomId: string): {
  roomState: RoomState | null;
  lastError: ErrorMessage | null;
  notFound: boolean;
  status: ConnectionStatus;
  join: (profile: Profile) => void;
  vote: (card: string) => void;
  setObserver: (participantId: string, observer: boolean) => void;
  setTitle: (title: string) => void;
  reveal: () => void;
  newRound: () => void;
} {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [lastError, setLastError] = useState<ErrorMessage | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const connectionRef = useRef<ReturnType<typeof createRoomConnection>>(null);

  useEffect(() => {
    const connection = createRoomConnection({
      roomId,
      deferJoin: getFacilitatorToken(roomId) === null,
      onState: (state) => {
        setRoomState(state);
        setStatus("open");
      },
      onError: setLastError,
      onNotFound: () => setNotFound(true),
      onClose: () => setStatus("closed"),
    });
    connectionRef.current = connection;
    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [roomId]);

  const join = useCallback((profile: Profile) => {
    saveProfile(profile);
    connectionRef.current?.join(profile);
  }, []);

  const vote = useCallback((card: string) => {
    connectionRef.current?.vote(card);
  }, []);

  const setObserver = useCallback(
    (participantId: string, observer: boolean) => {
      connectionRef.current?.setObserver(participantId, observer);
    },
    [],
  );

  const setTitle = useCallback((title: string) => {
    connectionRef.current?.setTitle(title);
  }, []);

  const reveal = useCallback(() => {
    connectionRef.current?.reveal();
  }, []);

  const newRound = useCallback(() => {
    connectionRef.current?.newRound();
  }, []);

  return {
    roomState,
    lastError,
    notFound,
    status,
    join,
    vote,
    setObserver,
    setTitle,
    reveal,
    newRound,
  };
}
