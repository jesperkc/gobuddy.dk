import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Details } from "./routes/details";
import { Interests } from "./routes/interests";
import { Location } from "./routes/location";
import { Signup } from "./routes/signup";
import { Login } from "./routes/login";
import { ConfirmEmail } from "./routes/confirmemail";
import { Completed } from "./routes/completed";
import { Index } from "./routes";
import { Profile } from "./routes/profile";
import { ProfileEdit } from "./routes/profile-edit";
import { supabase } from "./lib/supabase";
import { Home } from "./routes/home";

const authRoute = async () => {
  // get the user from the session and add to context
  const { data, error } = await supabase.auth.getSession();
  console.log("Session data:", data);
  console.log("Session error:", error);

  // if the user is not logged in, redirect to the login page
  if (!data.session?.user) {
    throw redirect({
      to: "/login",
      statusCode: 301,
    });
  }
};

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Index,
  beforeLoad: async () => {
    // get the user from the session and add to context
    const { data } = await supabase.auth.getSession();
    // if the user is already logged in, redirect to the home page
    if (data.session?.user) {
      throw redirect({
        to: "/home",
        statusCode: 301,
      });
    }
  },
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  component: Home,
  beforeLoad: () => ({
    fetchPosts: () => "foo",
  }),
  loader: ({ context: { fetchPosts } }) => {
    console.info(fetchPosts()); // 'foo'

    // ...
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
  beforeLoad: async () => {
    // get the user from the session and add to context
    const { data, error } = await supabase.auth.getSession();
    console.log("Session data:", data);
    console.log("Session error:", error);
    // if the user is already logged in, redirect to the home page
    if (data.session?.user) {
      throw redirect({
        to: "/profile",
        statusCode: 301,
      });
    }
  },
});

const detailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup/details",
  component: Details,
});

const interestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup/interests",
  component: Interests,
});

const locationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup/location",
  component: Location,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: Signup,
});

const confirmEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/confirm-email",
  component: ConfirmEmail,
});

const completedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/completed",
  component: Completed,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: Profile,
  beforeLoad: authRoute,
});

const profileEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/edit",
  component: ProfileEdit,
  beforeLoad: authRoute,
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  detailsRoute,
  interestsRoute,
  locationRoute,
  signupRoute,
  confirmEmailRoute,
  completedRoute,
  profileRoute,
  profileEditRoute,
  indexRoute,
]);
