import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

function fileFromMeta(meta) {
  const raw = typeof meta === "string" ? meta : (meta?.__raw ?? "");
  return /(?:title|file|filename)=["']?([^\s"']+)/.exec(raw)?.[1] ?? "";
}

export default defineConfig({
  site: process.env.SITE || "https://nga-tran.github.io",
  base: process.env.BASE || "/nga-tran",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
      transformers: [
        {
          name: "code-file-label",
          pre(node) {
            const file = fileFromMeta(this.options.meta);
            if (file) {
              node.properties["data-file"] = file;
            }
          },
        },
      ],
    },
  },
});
