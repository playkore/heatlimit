import { defineConfig } from "vite";

function normalizeBasePath(input: string | undefined): string {
  if (!input || input === "/") {
    return "/";
  }

  const prefixed = input.startsWith("/") ? input : `/${input}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

export default defineConfig({
  base: normalizeBasePath(process.env.BASE_PATH),
  root: ".",
  server: {
    open: false,
  },
});
