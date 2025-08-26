const path = require("path");

module.exports = {
  stories: ["../src/**/*.stories.@(ts|tsx|js|jsx|mdx)"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/web-components",
    options: {},
  },

  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.css$/i,
      use: ["style-loader", "css-loader", "postcss-loader"],
    });
    config.resolve.extensions.push(".ts", ".tsx");
    return config;
  },
};
