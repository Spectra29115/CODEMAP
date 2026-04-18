import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Github, Network, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import GraphView from "@/components/GraphView";
import Sidebar from "@/components/Sidebar";
import DetailsPanel from "@/components/DetailsPanel";
import AIDrawer from "@/components/AIDrawer";
import { useGraphStore } from "@/store/useGraphStore";

const Legend = () => (
  <div className="absolute bottom-4 left-4 z-10 glass rounded-lg px-3 py-2 text-[11px]">
    <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Legend</div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-node-entry" /> Entry</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-node-core" /> Core</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-node-utility" /> Utility</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-node-risk shadow-[0_0_6px_hsl(var(--node-risk))]" /> High risk</span>
    </div>
    <div className="mt-1 text-[10px] text-muted-foreground">Shortcuts: <kbd className="font-mono">+</kbd>/<kbd className="font-mono">-</kbd> zoom · <kbd className="font-mono">0</kbd> fit</div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const graph = useGraphStore((s) => s.graph);

  useEffect(() => {
    if (!graph) navigate("/", { replace: true });
  }, [graph, navigate]);

  if (!graph) return null;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-sidebar/70 px-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="h-3.5 w-3.5" /> New repo
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-primary">
              <Network className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-mono text-xs font-semibold">RepoNav</span>
          </div>
          <div className="ml-2 flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
            <Github className="h-3 w-3" /> {graph.repoName}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{graph.nodes.length} files</span>
          <span>·</span>
          <span>{graph.edges.length} dependencies</span>
          <AIDrawer
            trigger={
              <Button size="sm" className="h-7 gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Sparkles className="h-3.5 w-3.5" /> Ask AI
              </Button>
            }
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative min-w-0 flex-1"
        >
          <GraphView />
          <Legend />
        </motion.main>

        <DetailsPanel />
      </div>
    </div>
  );
};

export default Dashboard;
