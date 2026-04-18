

## Repository Architecture Navigator — Plan

A polished, dark-themed developer tool that visualizes a GitHub repo as an interactive dependency graph, with mock data and clearly marked backend integration points.

### Layout

**Header bar** (sticky top)
- Title: "Repository Architecture Navigator" + GitHub-style icon
- Subtitle: "Understand any codebase in seconds"
- Right side: "Explain Repository" button

**Input bar** (below header)
- GitHub URL input (with GitHub icon prefix)
- "Analyze" button with loading spinner state
- Search input: "Search functionality (e.g. authentication)" with submit-to-highlight behavior
- `// TODO: POST /analyze` and `// TODO: POST /search` markers

**Main split view**
- Left (70%): Cytoscape.js graph canvas, full height, dark background, subtle grid
- Right (30%): Sidebar with file details panel

### Graph (Cytoscape.js)

- Force-directed layout (cose) by default
- Zoom, pan, click-to-select
- Node colors:
  - Default: blue (`hsl(210 90% 60%)`)
  - High-impact (many dependents): red
  - Entry points: green
- Edges: thin gray arrows, animated on hover
- Selected node: glow/outline ring
- Search results: pulse + highlight, dim others
- Mock data with ~12 nodes (e.g., `index.js`, `App.tsx`, `auth.ts`, `api.ts`, `utils.ts`, …) and realistic edges

### Right Sidebar

When no node selected: empty state with icon + "Click a node to inspect a file"

When node selected:
- File name (mono font) + type badge
- **Dependencies** (list with arrow icons)
- **Used by** (reverse dependencies list)
- **AI Summary** section: "Summary will appear here" placeholder, loading skeleton
- `// TODO: GET /summarize?file=...`

### Explain Repository Modal

- Triggered from header button
- Centered modal (shadcn Dialog), dark
- Sections: Overview, Tech stack, Key modules, Architecture notes
- Placeholder: "Repository summary will appear here"
- `// TODO: POST /repo-summary`

### Component Structure

```
src/
  components/
    Header.tsx
    InputBar.tsx
    SearchBar.tsx
    GraphView.tsx          (Cytoscape wrapper)
    Sidebar.tsx
    SummaryModal.tsx
  lib/
    mockData.ts            (nodes/edges + sample summaries)
    cytoscapeStyles.ts     (node/edge style definitions)
  pages/
    Index.tsx              (orchestrates state)
```

### State (in `Index.tsx`)

- `repoUrl`, `isAnalyzing`
- `graphData` (nodes, edges)
- `selectedNode`
- `searchQuery`, `searchMatches`
- `repoSummaryOpen`, `repoSummary`, `summaryLoading`

### Design System

- Dark theme as default (set `dark` class on root)
- Update `index.css` tokens: deep slate background, blue primary, semantic tokens for graph node colors (`--node-default`, `--node-impact`, `--node-entry`, `--edge`)
- Inter for UI, JetBrains Mono for filenames/code
- Subtle transitions on panel changes, modal fade/scale

### Dependencies to add

- `cytoscape`
- `cytoscape-cose-bilkent` (nicer layout)
- `@types/cytoscape`

### Backend Integration Markers

Every API call site will have a clear `// TODO: backend` comment with expected endpoint, request shape, and response shape, so wiring up later is a drop-in replacement of the mock function.

