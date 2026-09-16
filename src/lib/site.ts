export const site = {
  title: "Nga Tran",
  author: "Nga Tran",
  avatar: "avatar.jpg",
  role: "Software engineer",
  focus: "Web platforms, TypeScript, and systems that stay operable in production.",
  description:
    "Technical writing on web platforms, TypeScript, static delivery, and the engineering details behind shipping reliable software.",
  readingsRepo: "https://github.com/NGA-TRAN/Blogs",
};

export function readingsUrl(path = ""): string {
  const base = site.readingsRepo.replace(/\/+$/, "");
  const clean = path.replace(/^\/+/, "");
  return clean ? `${base}/blob/main/${clean}` : base;
}

export const contentTypes = {
  guide: "Guide",
  note: "Note",
  essay: "Essay",
  tutorial: "Tutorial",
} as const;

export type ContentType = keyof typeof contentTypes;

/**
 * Comments are GitHub Issues, rendered by utterances.
 * One-time setup: install https://github.com/apps/utterances on this repo.
 */
export const comments = {
  repo: "NGA-TRAN/nga-tran.github.io",
  issueTerm: "pathname",
  label: "comments",
};

export function withBase(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const clean = path.replace(/^\/+/, "");
  if (!clean) return `${base}/`;
  return `${base}/${clean}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function readingTime(body = ""): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

export function languageLabel(lang: string): string {
  const labels: Record<string, string> = {
    ts: "TypeScript",
    typescript: "TypeScript",
    js: "JavaScript",
    javascript: "JavaScript",
    yaml: "YAML",
    yml: "YAML",
    bash: "Shell",
    sh: "Shell",
    shell: "Shell",
    md: "Markdown",
    markdown: "Markdown",
    json: "JSON",
    css: "CSS",
    html: "HTML",
    sql: "SQL",
    text: "Text",
  };
  return labels[lang.toLowerCase()] ?? lang.toUpperCase();
}
