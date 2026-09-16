# Nga Tran's blog

A static Astro blog published to GitHub Pages at [https://nga-tran.github.io/blog](https://nga-tran.github.io/blog).

Posts are Markdown files in `content/blog/`. Source code lives in `src/`.

## Local development

```bash
npm install
npm run dev
```

The site is served under the `/blog` base path: [http://localhost:4321/blog](http://localhost:4321/blog).

Search lives at [http://localhost:4321/blog/search/](http://localhost:4321/blog/search/). Filter by keyword, tag, or both. Shareable URLs look like `/blog/search/?q=sharding&tag=InfluxDB`.

## Writing a post

Add one Markdown file to `content/blog/` (not under `src/`). Prefix the filename with the publish date (`YYYY-MM-DD-slug.md`), or include a time (`YYYY-MM-DD-HH-mm-slug.md`):

```markdown
---
title: My post
description: A short summary for listings, RSS, and search.
pubDate: 2026-08-29
tags:
  - notes
---

Post body in Markdown.
```

The date prefix is stripped from the URL. `2026-08-29-my-post.md` is published at `/blog/blog/my-post/`.

Set `draft: true` to keep a post out of listings and RSS.

## Deploy to GitHub Pages

1. Create a public repository named `blog` under the `nga-tran` GitHub account and push this project to `main`.
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds the site and deploys on every push to `main`.

## Enable comments (giscus)

Comments are a client-side embed. They stay hidden until you configure them:

1. Enable **Discussions** on the `nga-tran/blog` repository.
2. Open [giscus.app](https://giscus.app), connect the repo, and choose a discussion category.
3. Copy `repo`, `repoId`, `category`, and `categoryId` into `src/lib/site.ts`.

## Design notes

See [docs/astro-blog.md](docs/astro-blog.md) for the architecture and file map.
