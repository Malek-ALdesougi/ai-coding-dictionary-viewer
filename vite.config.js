import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained dist/index.html (scripts, styles and data inlined) that opens straight from disk.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: { target: "es2020", outDir: "dist", emptyOutDir: true, reportCompressedSize: false },
});
