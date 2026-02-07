import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["iife", "esm"],
  globalName: "K256",
  dts: true,
  clean: true,
  minify: true,
  outDir: "dist",
  esbuildOptions(options) {
    // Output as widget.js / widget.mjs
    options.outfile = undefined
  },
})
