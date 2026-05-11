import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  root: ".",
  server: {
    open: false,
  },
});
