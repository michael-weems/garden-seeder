import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  // server: {
  //   port: 5000,
  // },
  // build: {
  //   outDir: "../build/render",
  // },
  plugins: [svelte()],
});
