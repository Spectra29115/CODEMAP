import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useGraphStore } from "@/store/useGraphStore";
import { api } from "@/services/api";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Where is authentication handled?",
  "Show payment flow",
  "Where does the app start?",
  "How do API calls work?",
];

interface AIDrawerProps {
  trigger: React.ReactNode;
}

const AIDrawer = ({ trigger }: AIDrawerProps) => {
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
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-[380px] border-l border-border bg-sidebar/95 backdrop-blur-xl sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-mono text-sm">
            <Sparkles className="h-4 w-4 text-primary-glow" /> Ask the codebase
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Where is auth handled?"
              className="h-9 flex-1 text-sm"
              autoFocus
            />
            {(highlightedIds.length > 0 || q) && (
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={clear}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" size="sm" className="h-9 gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Ask
            </Button>
          </form>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggestions</div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQ(s);
                    submit(s);
                  }}
                  className="rounded-full border border-border/70 bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {explanation && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="glass rounded-xl border-primary/20 p-3 text-[13px] leading-relaxed text-foreground/90"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-glow">
                  <Sparkles className="h-3 w-3" /> AI Explanation
                </div>
                {explanation}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AIDrawer;
