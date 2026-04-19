import { Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { useGraphStore } from "@/store/useGraphStore";
import { classifyNode } from "@/utils/fileImportance";
import MarkdownText from "@/components/MarkdownText";

export default function FileAnalysisPanel() {
  const graph = useGraphStore((s) => s.graph);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const fileAnalysisOpen = useGraphStore((s) => s.fileAnalysisOpen);
  const fileAnalysis = useGraphStore((s) => s.fileAnalysis);
  const setFileAnalysisOpen = useGraphStore((s) => s.setFileAnalysisOpen);
  const setFileAnalysis = useGraphStore((s) => s.setFileAnalysis);

  useEffect(() => {
    if (!graph || !selectedNodeId) return;
    if (fileAnalysis.fileId === selectedNodeId && fileAnalysis.markdown) {
      setFileAnalysisOpen(true);
      return;
    }

    const node = graph.nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;

    let cancelled = false;
    const importance = classifyNode(node.path);

    setFileAnalysisOpen(true);
    setFileAnalysis({
      fileId: selectedNodeId,
      loading: true,
      error: null,
      markdown: null,
    });

    api
      .analyzeFile({
        graphId: graph.id,
        fileId: selectedNodeId,
        filePath: node.path,
        fileName: node.label,
        level: importance.level,
        levelLabel: importance.badge ?? "Default",
      })
      .then((res) => {
        if (cancelled) return;
        setFileAnalysis({ loading: false, markdown: res.markdown, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setFileAnalysis({
          loading: false,
          error: "AI analysis unavailable right now.",
          markdown: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    graph,
    selectedNodeId,
    fileAnalysis.fileId,
    fileAnalysis.markdown,
    setFileAnalysis,
    setFileAnalysisOpen,
  ]);

  if (!graph || !fileAnalysisOpen || !fileAnalysis.fileId) return null;
  const node = graph.nodes.find((n) => n.id === fileAnalysis.fileId);
  if (!node) return null;

  const importance = classifyNode(node.path);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-4 right-4 z-30 w-[360px] rounded-xl border border-white/15 bg-[#0b1020]/72 p-3 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs font-semibold text-white/90">🔍 AI File Analysis</div>
          <div className="mt-1 font-mono text-[11px] text-white/70">{node.label}</div>
          {importance.badge && (
            <span
              className="mt-1 inline-block rounded-full border px-2 py-0.5 font-mono text-[10px]"
              style={{ borderColor: `${importance.colors.border}88`, color: importance.colors.border, backgroundColor: `${importance.colors.border}33` }}
            >
              {importance.badge}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFileAnalysisOpen(false)}
          className="rounded border border-white/20 p-1 text-white/70 hover:bg-white/10"
          aria-label="Close analysis panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-80 overflow-auto pr-1">
        {fileAnalysis.loading && (
          <div className="flex items-center gap-2 text-sm text-white/75">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
          </div>
        )}

        {!fileAnalysis.loading && fileAnalysis.error && (
          <div className="rounded border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">{fileAnalysis.error}</div>
        )}

        {!fileAnalysis.loading && fileAnalysis.markdown && <MarkdownText text={fileAnalysis.markdown} />}
      </div>
    </motion.div>
  );
}
