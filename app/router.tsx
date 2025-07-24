import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Import CSS for server-side rendering
import "../src/index.css";

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    // Enable server-side rendering context
    context: undefined!,
    // Configure for both client and server environments
    defaultPendingComponent: () => <div>Loading...</div>,
    defaultErrorComponent: ({ error }) => <div>Error: {error.message}</div>,
  });

  return router;
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
