import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { glob } from "glob";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: glob.sync(path.resolve(__dirname, "*.html")),
    },
    emptyOutDir: true,
  },
});
