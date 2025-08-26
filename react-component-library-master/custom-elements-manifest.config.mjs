export default {
  globs: ["src/TestComponent/TestComponent.tsx"],
  outdir: "./",
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
