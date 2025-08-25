// custom-elements-manifest.config.mjs
export default {
  globs: ["src/TestComponent/TestComponent.tsx"], // Path to your component
  outdir: "./", // Output directory for the manifest
  exclude: [
    "src/**/*.stories.tsx",
    "src/**/*.types.ts",
    "src/**/index.ts",
    "build/**",
    "util/**",
  ],
  plugins: [
    {
      name: "filter-bloat",
      packageLinkPhase({ customElementsManifest }) {
        // Filter out unwanted modules
        customElementsManifest.modules = customElementsManifest.modules.filter(
          (mod) =>
            mod.path.startsWith("src/") &&
            mod.path.endsWith(".tsx") &&
            mod.declarations?.some((d) => d.kind === "class")
        );
      },
    },
  ],
};
