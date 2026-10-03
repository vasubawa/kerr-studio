import fs from "node:fs";
import { defineConfig, type Plugin } from "vite";

function rawShader(): Plugin {
  return {
    name: "raw-shader",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      if (id.includes("?") || !/\.(frag|vert|glsl)$/.test(file)) return null;
      return `export default ${JSON.stringify(fs.readFileSync(file, "utf8"))};`;
    },
  };
}

export default defineConfig({
  plugins: [rawShader()],
  base: "./",
  server: {
    port: 3002,
    strictPort: true,
    open: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
