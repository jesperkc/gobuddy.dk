import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Index } from "./routes";

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Index,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Index,
});

const detailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/details",
  component: Index,
});

const interestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interests",
  component: Index,
});

const locationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/location",
  component: Index,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: Index,
});

const confirmEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/confirm-email",
  component: Index,
});

const completedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/completed",
  component: Index,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  detailsRoute,
  interestsRoute,
  locationRoute,
  signupRoute,
  confirmEmailRoute,
  completedRoute,
]);
