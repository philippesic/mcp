import { Config } from "@stencil/core";

export const config: Config = {
  // Other top-level config options here
  outputTargets: [
    {
      type: "dist-custom-elements",
      customElementsExportBehavior: "single-export-module",
      dir: "build",

      // Output target config options here
    },
    // Other output targets here
  ],
};
