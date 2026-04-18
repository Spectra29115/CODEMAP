import { useEffect, useRef, useState } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
// @ts-ignore - no types ship with this layout extension
import coseBilkent from "cytoscape-cose-bilkent";
import { GraphData } from "@/lib/mockData";
import { buildCytoscapeStyles } from "@/lib/cytoscapeStyles";

let registered = false;
if (!registered) {
  cytoscape.use(coseBilkent);
  registered = true;
}

interface GraphViewProps {
  data: GraphData | null;
  onSelectNode: (id: string | null) => void;
  searchMatches: string[];
}

export const GraphView = ({ data, onSelectNode, searchMatches }: GraphViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Re-render when theme changes so token colors refresh
  const [themeKey, setThemeKey] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((k) => k + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Initialize / update graph when data or theme changes
  useEffect(() => {
    if (!containerRef.current || !data) return;

    const elements: ElementDefinition[] = [
      ...data.nodes.map((n) => ({
        data: { id: n.id, label: n.label, kind: n.kind },
      })),
      ...data.edges.map((e) => ({
        data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target },
      })),
    ];

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: buildCytoscapeStyles(),
      layout: {
        name: "cose-bilkent",
        // @ts-expect-error - extension-specific options
        animate: "end",
        animationDuration: 600,
        nodeRepulsion: 6500,
        idealEdgeLength: 90,
        edgeElasticity: 0.45,
        gravity: 0.25,
        randomize: true,
        padding: 40,
      },
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id() as string;
      onSelectNode(id);

      cy.elements().removeClass("highlight dimmed");
      const node = evt.target;
      const connected = node.closedNeighborhood();
      cy.elements().not(connected).addClass("dimmed");
      connected.edges().addClass("highlight");
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        onSelectNode(null);
        cy.elements().removeClass("highlight dimmed");
        cy.$(":selected").unselect();
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, themeKey]);

  // Apply search highlights
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass("search-match");

    if (searchMatches.length === 0) {
      // Don't override neighborhood dimming created by selection
      if (cy.$(":selected").length === 0) {
        cy.elements().removeClass("dimmed");
      }
      return;
    }

    const matchSel = searchMatches.map((id) => `node[id = "${id}"]`).join(", ");
    const matched = cy.$(matchSel);
    matched.addClass("search-match");

    cy.elements().addClass("dimmed");
    matched.removeClass("dimmed");
    matched.connectedEdges().removeClass("dimmed").addClass("highlight");
    matched.neighborhood("node").removeClass("dimmed");

    if (matched.length > 0) {
      cy.animate({ fit: { eles: matched, padding: 80 }, duration: 500 });
    }
  }, [searchMatches]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
      <div ref={containerRef} className="relative h-full w-full" />
    </div>
  );
};

