import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy nothing: the frontend talks to the FastAPI backend directly
    // (CORS is open on the backend). Override with VITE_API_BASE_URL.
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
  },
});
