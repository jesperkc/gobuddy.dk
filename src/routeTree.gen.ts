import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./pages/__root";
import { Details } from "./pages/details";
import { Interests } from "./pages/interests";
import { Location } from "./pages/location";
import { Signup } from "./pages/signup";
import { Login } from "./pages/login";
import { ConfirmEmail } from "./pages/confirmemail";
import { Completed } from "./pages/completed";
import { Index } from "./pages";
import { Profile } from "./pages/profile";
import { ProfileEdit } from "./pages/profile-edit";
import { supabase } from "./lib/supabase";
import { Home } from "./pages/home";
import { AdminDashboard } from "./pages/godaddy";
import { AdminUsers } from "./pages/godaddy/users";
import { AdminCreateUser } from "./pages/godaddy/users/create";

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

const adminRoute = async () => {
  // get user and check if they are an admin
  const { data, error } = await supabase.auth.getUser();
  console.log("User data:", data);
  console.log("User error:", error);

  // check if the user is an admin
  if (!data.user || !data.user.app_metadata?.roles?.includes("admin")) {
    throw redirect({
      to: "/home",
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
  path: "/confirmemail",
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

const adminHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/godaddy",
  component: AdminDashboard,
  beforeLoad: adminRoute,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/godaddy/users",
  component: AdminUsers,
  beforeLoad: adminRoute,
});

const adminUsersCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/godaddy/users/create",
  component: AdminCreateUser,
  beforeLoad: adminRoute,
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
  adminHomeRoute,
  adminUsersRoute,
  adminUsersCreateRoute,
]);
