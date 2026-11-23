import { createFileRoute, redirect } from "@tanstack/react-router";

// Name and age now live on the signup step. Keep the URL alive for old links
// and visitors who bookmarked it.
export const Route = createFileRoute("/details")({
  beforeLoad: () => {
    throw redirect({ to: "/signup", replace: true });
  },
});
