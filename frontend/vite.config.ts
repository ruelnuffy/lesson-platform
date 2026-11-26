import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { getRequestListener } from "@hono/node-server";

function embeddedApiPlugin(): Plugin {
  return {
    name: "embedded-hono-api",
    async configureServer(server) {
      const { app } = await import("../server/app.js");
      const listener = getRequestListener(app.fetch);
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        if (url.startsWith("/api") || url === "/health" || url.startsWith("/uploads/")) {
          return listener(req, res);
        }
        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), embeddedApiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
