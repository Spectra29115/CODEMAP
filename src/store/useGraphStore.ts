import { create } from "zustand";
import type { GraphData, FileSummary, OnboardingStep } from "@/types/graph";

interface GraphStore {
  graph: GraphData | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedNodeIds: string[];
  summaries: Record<string, FileSummary>;
  onboarding: OnboardingStep[];
  currentStepIndex: number;
  queryExplanation: string | null;

  setGraph: (g: GraphData) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setHighlighted: (ids: string[], explanation?: string | null) => void;
  cacheSummary: (s: FileSummary) => void;
  setOnboarding: (steps: OnboardingStep[]) => void;
  setCurrentStep: (i: number) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  graph: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  highlightedNodeIds: [],
  summaries: {},
  onboarding: [],
  currentStepIndex: 0,
  queryExplanation: null,

  setGraph: (g) => set({ graph: g }),
  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),
  setHighlighted: (ids, explanation = null) =>
    set({ highlightedNodeIds: ids, queryExplanation: explanation }),
  cacheSummary: (s) =>
    set((state) => ({ summaries: { ...state.summaries, [s.fileId]: s } })),
  setOnboarding: (steps) => set({ onboarding: steps }),
  setCurrentStep: (i) => set({ currentStepIndex: i }),
  reset: () =>
    set({
      graph: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      highlightedNodeIds: [],
      summaries: {},
      onboarding: [],
      currentStepIndex: 0,
      queryExplanation: null,
    }),
}));
