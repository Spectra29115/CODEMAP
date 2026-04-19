import { Star } from "lucide-react";
import { useMemo } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { classifyNode } from "@/utils/fileImportance";

const legendRows = [
  { level: 1 as const, samplePath: "backend/src/index.ts" },
  { level: 2 as const, samplePath: "package-lock.json" },
  { level: 3 as const, samplePath: ".gitignore" },
];

export function FileImportanceLegend() {
  const items = legendRows.map(({ level, samplePath }) => {
    const sample = classifyNode(samplePath);
    return {
      level,
      indication: sample.badge ?? `L${level}`,
      color: sample.colors.border,
    };
  });

  return (
    <div className="absolute bottom-3 left-3 z-20 rounded-md border border-white/15 bg-[#0b1020]/72 p-1.5 shadow-lg backdrop-blur-xl pointer-events-auto">
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <div
            key={item.level}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-mono text-[9px] text-white/88">{item.indication}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CriticalFilesPanel() {
  const graph = useGraphStore((s) => s.graph);
  const selectNode = useGraphStore((s) => s.selectNode);

  const criticalNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((node) => classifyNode(node.path).level === 1).sort((a, b) => a.label.localeCompare(b.label));
  }, [graph]);

  if (!graph || criticalNodes.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-20 w-[280px] rounded-xl border border-white/15 bg-[#0b1020]/65 p-3 shadow-2xl backdrop-blur-xl pointer-events-auto">
      <div className="mb-2 flex items-center gap-2">
        <Star className="h-3.5 w-3.5 text-[#FF2D55]" />
        <h3 className="font-mono text-xs font-semibold tracking-wide text-white/90">⭐ Critical Files</h3>
      </div>
      <div className="max-h-44 space-y-1 overflow-auto pr-1">
        {criticalNodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => selectNode(node.id)}
            className="block w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-left font-mono text-[11px] text-white/85 hover:border-[#FF2D55]/60 hover:bg-[#FF2D55]/15"
          >
            {node.label}
          </button>
        ))}
      </div>
    </div>
  );
}
