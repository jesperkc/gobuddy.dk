import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => {
    return {
      // links: [{ rel: "stylesheet", href: "https://rsms.me/inter/inter.css" }],
    };
  },
  // beforeLoad: async () => {
  //   // Get the user from the session and add to context
  //   const { data, error } = supabase.auth.getSession();
  //   console.log("Session data:", data);
  //   console.log("Session error:", error);
  //   return {
  //     data,
  //   };
  //   // if (error) {
  //   //   console.error("Error getting session:", error);
  //   //   return { user: null };
  //   // }
  //   // if (data.session) {
  //   //   const { data: userData, error: userError } = await supabase.auth.getUser();
  //   //   if (userError) {
  //   //     console.error("Error getting user:", userError);
  //   //     return { user: null };
  //   //   }
  //   //   console.log("User authenticated:", userData.user);
  //   //   return { user: userData.user };
  //   // }
  //   // console.log("No user session found");
  //   // return { user: null };
  // },
  // errorComponent: (props) => {
  //   return (
  //     <RootDocument>
  //       <DefaultCatchBoundary {...props} />
  //     </RootDocument>
  //   );
  // },
  // notFoundComponent: () => <NotFound />,
  component: () => <Outlet />,
});
