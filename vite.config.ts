import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { aliases } from "./aliases.ts";

export default defineConfig({
  resolve: { alias: aliases },
  plugins: [react(), tailwindcss(), cloudflare()],
});
