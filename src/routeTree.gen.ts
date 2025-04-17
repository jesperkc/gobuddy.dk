import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Details } from "./routes/details";
import { Interests } from "./routes/interests";
import { Location } from "./routes/location";
import { Signup } from "./routes/signup";
import { Login } from "./routes/login";
import { ConfirmEmail } from "./routes/confirmemail";
import { Completed } from "./routes/completed";
import { Index } from "./routes";

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Index,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const detailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/details",
  component: Details,
});

const interestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interests",
  component: Interests,
});

const locationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/location",
  component: Location,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: Signup,
});

const conformEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/confirm-email",
  component: ConfirmEmail,
});

const completedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/completed",
  component: Completed,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  detailsRoute,
  interestsRoute,
  locationRoute,
  signupRoute,
  conformEmailRoute,
  completedRoute,
]);
