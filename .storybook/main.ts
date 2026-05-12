import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../packages/*/src/**/*.stories.@(ts|tsx)",
    "../packages/*/stories/**/*.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y", "@storybook/addon-interactions"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal(config) {
    return config;
  },
};

export default config;
