import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          codemirror: [
            "@codemirror/state", "@codemirror/view", "@codemirror/commands", "@codemirror/language",
            "@codemirror/lang-cpp", "@codemirror/lang-python", "@codemirror/autocomplete", "@codemirror/search",
          ],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
