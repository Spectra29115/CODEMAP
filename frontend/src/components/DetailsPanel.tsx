import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpLeft, FileCode, X } from "lucide-react";
import { useGraphStore } from "@/store/useGraphStore";
import { api } from "@/services/api";
import MarkdownText from "@/components/MarkdownText";
import { classifyNode } from "@/utils/fileImportance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetailsPanelProps {
  onClosePanel?: () => void;
  compact?: boolean;
}

const DetailsPanel = ({ onClosePanel, compact = false }: DetailsPanelProps) => {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const summaries = useGraphStore((s) => s.summaries);
  const cacheSummary = useGraphStore((s) => s.cacheSummary);
  const graph = useGraphStore((s) => s.graph);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const summary = selectedNodeId ? summaries[selectedNodeId] : null;
  const aiSummary = selectedNodeId ? aiSummaries[selectedNodeId] : null;

  useEffect(() => {
    if (!selectedNodeId || summaries[selectedNodeId]) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getSummary(selectedNodeId, graph?.id)
      .then((s) => !cancelled && cacheSummary(s))
      .catch(() => !cancelled && setError("Could not load summary."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedNodeId, summaries, cacheSummary, graph?.id]);

  useEffect(() => {
    if (!graph || !selectedNodeId || aiSummaries[selectedNodeId]) return;

    const node = graph.nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;

    let cancelled = false;
    const importance = classifyNode(node.path);

    setAiLoading(true);
    setAiError(null);

    api
      .analyzeFile({
        graphId: graph.id,
        fileId: node.id,
        filePath: node.path,
        fileName: node.label,
        level: importance.level,
        levelLabel: importance.badge ?? "Default",
      })
      .then((res) => {
        if (cancelled) return;
        setAiSummaries((current) => ({ ...current, [node.id]: res.markdown }));
      })
      .catch(() => {
        if (cancelled) return;
        setAiError("Could not load AI summary.");
      })
      .finally(() => {
        if (cancelled) return;
        setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [graph, selectedNodeId, aiSummaries]);

  const findLabel = (id: string) => graph?.nodes.find((n) => n.id === id)?.label ?? id;
  const findIdByName = (name: string) => graph?.nodes.find((n) => n.label === name)?.id;

  const closePanel = () => {
    if (onClosePanel) {
      onClosePanel();
      return;
    }
    selectNode(null);
  };

  return (
    <aside className={`relative flex h-full flex-col border-l border-border/80 bg-sidebar/82 backdrop-blur-xl ${compact ? "w-[340px] shadow-2xl" : "w-[360px]"}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/8 to-transparent" />
      <AnimatePresence mode="wait">
        {!selectedNodeId ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground ring-1 ring-primary/20">
              <FileCode className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-foreground">No file selected</div>
            <p className="text-xs text-muted-foreground">
              Click any node in the graph or pick a file from the sidebar to see its AI summary and dependencies.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={selectedNodeId}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            className="flex h-full flex-col"
          >
            <div className="flex items-start justify-between gap-2 border-b border-border/60 p-4">
              <div className="min-w-0">
                <div className="truncate font-mono text-sm font-semibold text-foreground">
                  {summary?.name ?? findLabel(selectedNodeId)}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {summary?.path ?? ""}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={closePanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-5 p-4">
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                    {error}
                  </div>
                )}

                {aiError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                    {aiError}
                  </div>
                )}

                {summary && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border bg-secondary/50 font-mono text-[10px]">
                        {summary.language}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-secondary/50 font-mono text-[10px]">
                        {summary.loc} LOC
                      </Badge>
                    </div>

                    <section>
                      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        AI Summary
                      </h3>
                      {aiSummary ? (
                        <MarkdownText text={aiSummary} className="text-[13px]" />
                      ) : (
                        <p className="text-[13px] leading-relaxed text-foreground/90">{summary.summary}</p>
                      )}
                    </section>

                    <section>
                      <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <ArrowDownRight className="h-3 w-3" /> Dependencies ({summary.dependencies.length})
                      </h3>
                      <ul className="space-y-1">
                        {summary.dependencies.length === 0 && (
                          <li className="text-xs text-muted-foreground">No outgoing dependencies.</li>
                        )}
                        {summary.dependencies.map((d) => {
                          const id = findIdByName(d);
                          return (
                            <li key={d}>
                              <button
                                onClick={() => id && selectNode(id)}
                                className="w-full truncate rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-left font-mono text-[12px] text-foreground/90 transition-colors hover:border-primary/40 hover:bg-primary/10"
                              >
                                {d}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>

                    <section>
                      <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <ArrowUpLeft className="h-3 w-3" /> Used by ({summary.usedBy.length})
                      </h3>
                      <ul className="space-y-1">
                        {summary.usedBy.length === 0 && (
                          <li className="text-xs text-muted-foreground">Nothing imports this file.</li>
                        )}
                        {summary.usedBy.map((d) => {
                          const id = findIdByName(d);
                          return (
                            <li key={d}>
                              <button
                                onClick={() => id && selectNode(id)}
                                className="w-full truncate rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-left font-mono text-[12px] text-foreground/90 transition-colors hover:border-primary/40 hover:bg-primary/10"
                              >
                                {d}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

export default DetailsPanel;
