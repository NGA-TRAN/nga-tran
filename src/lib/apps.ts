export type App = {
  id: string;
  title: string;
  description: string;
  /** Absolute URL, or a path on this site such as `/` or `search/`. */
  href: string;
  /** Small line above the title. Defaults to the hostname for external links. */
  label?: string;
  /** Site-relative path to a square app icon, e.g. `apps/plan-visualizer.png`. */
  icon?: string;
};

/**
 * Published apps and sites. Add a new object here when something goes live.
 */
export function getApp(id: string): App | undefined {
  return apps.find((app) => app.id === id);
}

export const apps: App[] = [
  {
    id: "plan-visualizer",
    title: "Plan Visualizer",
    description: "Turns DataFusion EXPLAIN output into an Excalidraw diagram.",
    href: "https://nga-tran.github.io/plan-visualizer/",
    icon: "apps/plan-visualizer.png",
  },
];
