import type { Preview } from "@storybook/react";

// Import all four themes so they're available via the toolbar switcher.
import "../packages/themes/src/classroom.css";
import "../packages/themes/src/story.css";
import "../packages/themes/src/admin.css";
import "../packages/themes/src/minimal.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    a11y: {
      // Axe-core configuration.
      element: "#storybook-root",
      config: {
        rules: [
          // Allow sufficient colour contrast for dark video player backgrounds.
          { id: "color-contrast", enabled: true },
        ],
      },
      options: {},
      manual: false,
    },
  },
  // Global toolbar: theme switcher
  globalTypes: {
    theme: {
      description: "Player theme",
      defaultValue: "classroom",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "classroom", title: "Classroom" },
          { value: "story", title: "Story" },
          { value: "admin", title: "Admin" },
          { value: "minimal", title: "Minimal" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
