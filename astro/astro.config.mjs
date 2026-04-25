// @ts-check
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
      mode: "worker",
      bindings: {
          sortinglifedb: "sortinglifedb",
      },
	}),

  vite: {
      plugins: [tailwindcss()],
	},

  integrations: [react()],
});