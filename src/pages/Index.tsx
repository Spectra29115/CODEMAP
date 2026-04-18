import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { InputBar } from "@/components/InputBar";
import { GraphView } from "@/components/GraphView";
import { Graph3DView } from "@/components/Graph3DView";
import { Sidebar } from "@/components/Sidebar";
import { SummaryModal, RepoSummary } from "@/components/SummaryModal";
import { ViewModeToggle, ViewMode } from "@/components/ViewModeToggle";
import {
  GraphData,
  GraphNode,
  mockFileSummary,
  mockGraphData,
  mockRepoSummary,
} from "@/lib/mockData";

const Index = () => {
  // Core state
  const [repoUrl, setRepoUrl] = useState("https://github.com/facebook/react");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fileSummary, setFileSummary] = useState<string | null>(null);
  const [fileSummaryLoading, setFileSummaryLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<string[]>([]);

  const [repoSummaryOpen, setRepoSummaryOpen] = useState(false);
  const [repoSummary, setRepoSummary] = useState<RepoSummary | null>(null);
  const [repoSummaryLoading, setRepoSummaryLoading] = useState(false);

  const selectedNode: GraphNode | null = useMemo(
    () => graphData?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graphData, selectedNodeId],
  );

  // TODO: POST /analyze { repo_url } -> { nodes, edges }
  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;
    setIsAnalyzing(true);
    setSelectedNodeId(null);
    setSearchQuery("");
    setSearchMatches([]);
    setGraphData(null);

    await new Promise((r) => setTimeout(r, 900));
    setGraphData(mockGraphData);
    setIsAnalyzing(false);
  };

  // TODO: GET /summarize?file={id} -> { summary }
  useEffect(() => {
    if (!selectedNodeId) {
      setFileSummary(null);
      return;
    }
    setFileSummaryLoading(true);
    setFileSummary(null);
    const t = setTimeout(() => {
      setFileSummary(mockFileSummary(selectedNodeId));
      setFileSummaryLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [selectedNodeId]);

  // TODO: POST /search { query } -> { matches: string[] }
  const handleSearch = (q: string) => {
    if (!graphData) return;
    const query = q.trim().toLowerCase();
    if (!query) {
      setSearchMatches([]);
      return;
    }
    const matches = graphData.nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(query) ||
          n.path.toLowerCase().includes(query) ||
          mockFileSummary(n.id).toLowerCase().includes(query),
      )
      .map((n) => n.id);
    setSearchMatches(matches);
  };

  // TODO: POST /repo-summary { repo_url } -> RepoSummary
  const handleExplainRepo = async () => {
    setRepoSummaryOpen(true);
    if (repoSummary) return;
    setRepoSummaryLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setRepoSummary(mockRepoSummary);
    setRepoSummaryLoading(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header onExplainRepo={handleExplainRepo} hasGraph={!!graphData} />
      <InputBar
        repoUrl={repoUrl}
        onRepoUrlChange={setRepoUrl}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearch}
        hasGraph={!!graphData}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <section className="relative min-h-[420px] border-r border-border">
          {/* View mode toggle */}
          <div className="pointer-events-none absolute right-4 top-4 z-20">
            <div className="pointer-events-auto">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {!graphData ? (
            <EmptyGraph />
          ) : viewMode === "3d" ? (
            <Graph3DView
              data={graphData}
              selectedId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              searchMatches={searchMatches}
            />
          ) : (
            <GraphView
              data={graphData}
              onSelectNode={setSelectedNodeId}
              searchMatches={searchMatches}
            />
          )}

          {/* Legend */}
          {graphData && (
            <div className="pointer-events-none absolute bottom-4 left-4 flex gap-3 rounded-lg border border-border bg-card/85 px-3 py-2 text-xs shadow-sm backdrop-blur-md">
              <LegendDot color="hsl(var(--node-entry))" label="Entry" />
              <LegendDot color="hsl(var(--node-default))" label="Module" />
              <LegendDot color="hsl(var(--node-impact))" label="High impact" />
            </div>
          )}
        </section>

        <Sidebar
          selectedNode={selectedNode}
          graph={graphData}
          summary={fileSummary}
          summaryLoading={fileSummaryLoading}
        />
      </main>

      <SummaryModal
        open={repoSummaryOpen}
        onOpenChange={setRepoSummaryOpen}
        summary={repoSummary}
        loading={repoSummaryLoading}
        repoUrl={repoUrl}
      />
    </div>
  );
};

const EmptyGraph = () => (
  <div className="relative h-full w-full">
    <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="rounded-xl border border-border bg-card px-6 py-5 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Enter a GitHub repository URL above and click{" "}
          <span className="font-medium text-foreground">Analyze</span> to visualize its
          architecture.
        </p>
      </div>
    </div>
  </div>
);

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ backgroundColor: color }} />
    <span className="font-medium text-foreground/80">{label}</span>
  </div>
);

export default Index;
