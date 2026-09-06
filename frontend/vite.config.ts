import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:7000", // Adjust to your backend port
      // Real-time (Socket.IO) traffic → same backend
      "/socket.io": {
        target: "http://localhost:7000",
        ws: true,
      },
    },
  },
});
