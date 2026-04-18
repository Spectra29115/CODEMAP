import { ArrowDownRight, ArrowUpRight, FileCode2, MousePointerClick, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { GraphData, GraphNode } from "@/lib/mockData";

interface SidebarProps {
  selectedNode: GraphNode | null;
  graph: GraphData | null;
  summary: string | null;
  summaryLoading: boolean;
}

export const Sidebar = ({ selectedNode, graph, summary, summaryLoading }: SidebarProps) => {
  if (!selectedNode) {
    return (
      <aside className="flex h-full flex-col items-center justify-center border-l border-border bg-card/50 p-8 text-center backdrop-blur-sm">
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <MousePointerClick className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">No file selected</h3>
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
          Click a node in the graph to inspect its dependencies and AI-generated summary.
        </p>
      </aside>
    );
  }

  const dependencies =
    graph?.edges.filter((e) => e.source === selectedNode.id).map((e) => e.target) ?? [];
  const usedBy =
    graph?.edges.filter((e) => e.target === selectedNode.id).map((e) => e.source) ?? [];

  const kindLabel =
    selectedNode.kind === "entry"
      ? "Entry point"
      : selectedNode.kind === "impact"
        ? "High impact"
        : "Module";

  return (
    <aside className="flex h-full flex-col border-l border-border bg-card/60 backdrop-blur-md">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-primary" />
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            {kindLabel}
          </Badge>
        </div>
        <h2 className="mt-2.5 break-all font-mono text-sm font-semibold text-foreground">
          {selectedNode.label}
        </h2>
        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
          {selectedNode.path}
        </p>
        <div className="mt-3 flex gap-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">{selectedNode.language}</span>
          <span>·</span>
          <span>{selectedNode.loc} LOC</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-5">
          <Section
            title="Depends on"
            icon={<ArrowUpRight className="h-3.5 w-3.5 text-primary" />}
            items={dependencies}
            empty="No outgoing dependencies"
          />
          <Separator className="opacity-60" />
          <Section
            title="Used by"
            icon={<ArrowDownRight className="h-3.5 w-3.5 text-[hsl(var(--node-impact))]" />}
            items={usedBy}
            empty="Not imported anywhere"
          />
          <Separator className="opacity-60" />

          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                AI summary
              </h3>
            </div>
            {/* TODO: GET /summarize?file={selectedNode.id} */}
            {summaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[90%]" />
                <Skeleton className="h-3 w-[75%]" />
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-foreground/90">
                {summary ?? "Summary will appear here"}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
};

const Section = ({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  empty: string;
}) => (
  <div>
    <div className="mb-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {items.length}
      </span>
    </div>
    {items.length === 0 ? (
      <p className="text-xs text-muted-foreground">{empty}</p>
    ) : (
      <ul className="space-y-1">
        {items.map((id) => (
          <li
            key={id}
            className="rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[11px] text-foreground/90 transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            {id}
          </li>
        ))}
      </ul>
    )}
  </div>
);
