import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://chuishiban.com",
  output: "static",
  build: { format: "directory" },
});
