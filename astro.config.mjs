import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import compressor from "astro-compressor";

// https://astro.build/config
export default defineConfig({
  site: "https://coresolutions.ltd",
  prefetch: true,
  integrations: [
    compressor({
      gzip: false,
      brotli: true,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  output: "static",
  experimental: {
    clientPrerender: true,
  },
});
