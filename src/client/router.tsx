import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { useRoomConnection } from "./realtime/useRoomConnection.ts";

const rootRoute = createRootRoute({ component: Outlet });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => null,
});

function RoomPage() {
  const { roomId } = roomRoute.useParams();
  useRoomConnection(roomId);
  return null;
}

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/r/$roomId",
  component: RoomPage,
});

const routeTree = rootRoute.addChildren([homeRoute, roomRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
