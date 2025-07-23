import { createFileRoute } from "@tanstack/react-router";
import { SplitScreen } from "../../src/components/SplitScreen";

function Index() {
  return (
    <SplitScreen>
      <div className="">
        <h1 className="text-2xl mb-6">
          Mød dine nye
          <br /> bedste venner
        </h1>
      </div>
    </SplitScreen>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
});
