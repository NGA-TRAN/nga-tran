import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/** `2026-08-01-hello-world.md` or `2026-08-01-14-30-hello-world.md` → `hello-world` */
function postId({ entry }: { entry: string }): string {
  return entry
    .replace(/\.md$/i, "")
    .replace(/(^|\/)\d{4}-\d{2}-\d{2}(?:-\d{2}-\d{2}(?:-\d{2})?)?-/, "$1");
}

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./content/blog",
    generateId: postId,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    type: z.enum(["guide", "note", "essay", "tutorial"]).default("note"),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    ogImage: z.string().optional(),
    app: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
