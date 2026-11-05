import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { Home } from "./routes/Home.tsx";
import { Room } from "./routes/Room.tsx";

const rootRoute = createRootRoute({ component: Outlet });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

function RoomPage() {
  const { roomId } = roomRoute.useParams();
  return <Room roomId={roomId} />;
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
