import { Config } from "@stencil/core";

export const config: Config = {
  namespace: "react-component-library-master",
  srcDir: "src",
  outputTargets: [
    {
      type: "dist-custom-elements",
      dir: "build",
      customElementsExportBehavior: "single-export-module",
    },
  ],
};
