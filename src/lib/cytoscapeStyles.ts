import type cytoscape from "cytoscape";

// Read an HSL CSS variable and return a usable color string.
const cssHsl = (varName: string, alpha = 1) => {
  if (typeof window === "undefined") return `hsl(210 90% 60% / ${alpha})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw ? `hsl(${raw} / ${alpha})` : `hsl(210 90% 60% / ${alpha})`;
};

export const buildCytoscapeStyles = (): cytoscape.StylesheetJson => [
  {
    selector: "node",
    style: {
      "background-color": cssHsl("--node-default"),
      "border-width": 2,
      "border-color": cssHsl("--background"),
      label: "data(label)",
      color: cssHsl("--foreground"),
      "font-size": 12,
      "font-weight": 600,
      "font-family": "JetBrains Mono, monospace",
      "text-valign": "bottom",
      "text-margin-y": 10,
      "text-background-color": cssHsl("--card"),
      "text-background-opacity": 0.92,
      "text-background-padding": "4px",
      "text-background-shape": "roundrectangle",
      "text-border-color": cssHsl("--border"),
      "text-border-opacity": 1,
      "text-border-width": 1,
      width: 30,
      height: 30,
      "transition-property": "background-color, border-color, border-width, width, height, opacity",
      "transition-duration": 200,
    },
  },
  {
    selector: 'node[kind = "impact"]',
    style: {
      "background-color": cssHsl("--node-impact"),
      "border-color": cssHsl("--node-impact", 0.4),
      width: 36,
      height: 36,
    },
  },
  {
    selector: 'node[kind = "entry"]',
    style: {
      "background-color": cssHsl("--node-entry"),
      "border-color": cssHsl("--node-entry", 0.4),
      width: 34,
      height: 34,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 4,
      "border-color": cssHsl("--node-selected"),
      "background-color": cssHsl("--node-selected"),
      "overlay-color": cssHsl("--node-selected"),
      "overlay-opacity": 0.15,
      "overlay-padding": 8,
    },
  },
  {
    selector: "node.search-match",
    style: {
      "border-width": 4,
      "border-color": cssHsl("--node-selected"),
      "overlay-color": cssHsl("--node-selected"),
      "overlay-opacity": 0.25,
      "overlay-padding": 10,
    },
  },
  {
    selector: "node.dimmed",
    style: {
      opacity: 0.18,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.4,
      "line-color": cssHsl("--edge"),
      "target-arrow-color": cssHsl("--edge"),
      "target-arrow-shape": "triangle",
      "arrow-scale": 1,
      "curve-style": "bezier",
      opacity: 0.85,
      "transition-property": "line-color, target-arrow-color, width, opacity",
      "transition-duration": 200,
    },
  },
  {
    selector: "edge.highlight",
    style: {
      width: 2.2,
      "line-color": cssHsl("--edge-active"),
      "target-arrow-color": cssHsl("--edge-active"),
      opacity: 1,
    },
  },
  {
    selector: "edge.dimmed",
    style: {
      opacity: 0.08,
    },
  },
];
