import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/user": "http://localhost:5000",
      "/auth": "http://localhost:5000",
      "/course": "http://localhost:5000",
      "/userCourse": "http://localhost:5000",
    },
  },
});
