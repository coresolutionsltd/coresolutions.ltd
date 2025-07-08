import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import compressor from "astro-compressor";

// https://astro.build/config
export default defineConfig({
  site: "https://coresolutions.ltd",
  prefetch: true,
  integrations: [
    tailwind(),
    compressor({
      gzip: false,
      brotli: true,
    }),
  ],
  output: "static",
  experimental: {
    clientPrerender: true,
  },
});
