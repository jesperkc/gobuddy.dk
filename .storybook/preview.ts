import type { Preview } from "@storybook/react-vite";
import "../src/index.css";
import "../src/vendor-styles";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: { disable: true },
    options: { storySort: { order: ["Flows", ["Overblik"]] } },
  },
};

export default preview;
