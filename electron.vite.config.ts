import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          app: resolve("src/preload/app.ts"),
          selection: resolve("src/preload/selection.ts")
        }
      }
    }
  },
  renderer: {
    root: resolve("src/renderer"),
    plugins: [react()]
  }
});
