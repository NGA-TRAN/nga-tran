# Nga Tran's blog

A static Astro blog published to GitHub Pages at [https://nga-tran.github.io](https://nga-tran.github.io).

Posts are Markdown files in `content/blog/`. Source code lives in `src/`.

## Local development

```bash
npm install
npm run dev
```

The site is served at the root: [http://localhost:4321/](http://localhost:4321/).

Search lives at [http://localhost:4321/search/](http://localhost:4321/search/). Filter by keyword, tag, or both. Shareable URLs look like `/search/?q=sharding&tag=InfluxDB`.

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

The date prefix is stripped from the URL. `2026-08-29-my-post.md` is published at `/blog/my-post/`.

Set `draft: true` to keep a post out of listings and RSS.

## Deploy to GitHub Pages

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages.

## Comments

Each post’s comment thread is a GitHub Issue, rendered by [utterances](https://utteranc.es). The deploy workflow keeps a `comments` label on those issues.

One-time setup: install the [utterances GitHub App](https://github.com/apps/utterances) on `NGA-TRAN/nga-tran.github.io`.

## Design notes

See [docs/astro-blog.md](docs/astro-blog.md) for the architecture and file map.
