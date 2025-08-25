import { Config } from "@stencil/core";

export const config: Config = {
  namespace: "react-component-library-master",
  srcDir: "src", // source directory for components
  outputTargets: [
    {
      type: "dist-custom-elements",
      dir: "build", // output directory for custom-elements.json and built files
      customElementsExportBehavior: "single-export-module",
    },
  ],
};
