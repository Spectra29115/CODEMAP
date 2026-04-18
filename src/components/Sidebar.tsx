import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileCode, Folder, FolderOpen, Search, Map, CircleDot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/store/useGraphStore";
import type { FileTreeNode } from "@/types/graph";

const TreeItem = ({ node, depth }: { node: FileTreeNode; depth: number }) => {
  const [open, setOpen] = useState(depth < 2);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {open ? <FolderOpen className="h-3.5 w-3.5 text-primary/80" /> : <Folder className="h-3.5 w-3.5" />}
          <span className="truncate font-mono text-[13px]">{node.name}</span>
        </button>
        {open && node.children?.map((c) => <TreeItem key={c.path} node={c} depth={depth + 1} />)}
      </div>
    );
  }

  const isSelected = node.fileId && node.fileId === selectedNodeId;
  return (
    <button
      onClick={() => node.fileId && selectNode(node.fileId)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors",
        isSelected
          ? "bg-primary/15 text-primary-glow"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      <FileCode className={cn("h-3.5 w-3.5 shrink-0", isSelected && "text-primary")} />
      <span className="truncate font-mono text-[13px]">{node.name}</span>
    </button>
  );
};

// Filter tree to nodes whose path includes the query (preserve folders)
const filterTree = (nodes: FileTreeNode[], q: string): FileTreeNode[] => {
  if (!q) return nodes;
  const ql = q.toLowerCase();
  const walk = (n: FileTreeNode): FileTreeNode | null => {
    if (n.type === "file") return n.path.toLowerCase().includes(ql) ? n : null;
    const kids = (n.children ?? []).map(walk).filter(Boolean) as FileTreeNode[];
    if (kids.length || n.path.toLowerCase().includes(ql)) return { ...n, children: kids };
    return null;
  };
  return nodes.map(walk).filter(Boolean) as FileTreeNode[];
};

const Sidebar = () => {
  const graph = useGraphStore((s) => s.graph);
  const onboarding = useGraphStore((s) => s.onboarding);
  const currentStepIndex = useGraphStore((s) => s.currentStepIndex);
  const setCurrentStep = useGraphStore((s) => s.setCurrentStep);
  const selectNode = useGraphStore((s) => s.selectNode);
  const [q, setQ] = useState("");

  const tree = useMemo(() => filterTree(graph?.fileTree ?? [], q.trim()), [graph, q]);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-sidebar/70 backdrop-blur-xl">
      <div className="border-b border-border/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Map className="h-3.5 w-3.5" /> Onboarding path
        </div>
        <ol className="space-y-1">
          {onboarding.map((step, i) => {
            const active = i === currentStepIndex;
            return (
              <li key={step.id}>
                <button
                  onClick={() => {
                    setCurrentStep(i);
                    selectNode(step.fileId);
                  }}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-all",
                    active
                      ? "bg-primary/10 text-foreground ring-1 ring-primary/40"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {active ? <CircleDot className="h-3 w-3" /> : step.order}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{step.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{step.description}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="border-b border-border/60 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search files…"
            className="h-8 border-border bg-secondary/40 pl-8 font-mono text-[12px] placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {tree.length ? tree.map((n) => <TreeItem key={n.path} node={n} depth={0} />) : (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">No files match.</div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;
