import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGraphStore } from "@/store/useGraphStore";
import { api } from "@/services/api";
import { toast } from "sonner";

const QueryBox = () => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const graph = useGraphStore((s) => s.graph);
  const setHighlighted = useGraphStore((s) => s.setHighlighted);
  const explanation = useGraphStore((s) => s.queryExplanation);
  const highlightedIds = useGraphStore((s) => s.highlightedNodeIds);

  const submit = async (text: string) => {
    if (!text.trim() || !graph) return;
    setLoading(true);
    try {
      const res = await api.query(graph.id, text.trim());
      setHighlighted(res.highlightedNodeIds, res.explanation);
    } catch {
      toast.error("Query failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setQ("");
    setHighlighted([], null);
  };

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-full max-w-2xl -translate-x-1/2 px-4">
      <div className="pointer-events-auto glass rounded-xl p-2 shadow-elegant">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(q);
          }}
          className="flex items-center gap-2"
        >
          <Sparkles className="ml-2 h-4 w-4 text-primary-glow" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask about the codebase…  e.g. ‘Where is auth handled?’"
            className="h-9 flex-1 border-0 bg-transparent text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0"
          />
          {(highlightedIds.length > 0 || q) && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={clear}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            className="h-8 gap-1.5 bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_hsl(var(--primary)/0.6)] transition-colors hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Ask
          </Button>
        </form>

      </div>

      <AnimatePresence>
        {explanation && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="pointer-events-auto mt-2 glass rounded-xl border-primary/20 p-3 text-[13px] leading-relaxed text-foreground/90"
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-glow">
              <Sparkles className="h-3 w-3" /> AI Explanation
            </div>
            {explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QueryBox;
