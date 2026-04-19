import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChatMessage, GraphData, FileSummary, OnboardingStep } from "@/types/graph";

interface FileAnalysisState {
  fileId: string | null;
  loading: boolean;
  error: string | null;
  markdown: string | null;
}

interface GraphStore {
  graph: GraphData | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedNodeIds: string[];
  summaries: Record<string, FileSummary>;
  onboarding: OnboardingStep[];
  currentStepIndex: number;
  queryExplanation: string | null;
  fileAnalysisOpen: boolean;
  fileAnalysis: FileAnalysisState;
  chatOpen: boolean;
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  setGraph: (g: GraphData) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setHighlighted: (ids: string[], explanation?: string | null) => void;
  cacheSummary: (s: FileSummary) => void;
  setOnboarding: (steps: OnboardingStep[]) => void;
  setCurrentStep: (i: number) => void;
  setFileAnalysisOpen: (open: boolean) => void;
  setFileAnalysis: (state: Partial<FileAnalysisState>) => void;
  setChatOpen: (open: boolean) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  appendChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  resetChat: () => void;
  reset: () => void;
}

export const useGraphStore = create<GraphStore>()(
  persist(
    (set) => ({
      graph: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      highlightedNodeIds: [],
      summaries: {},
      onboarding: [],
      currentStepIndex: 0,
      queryExplanation: null,
      fileAnalysisOpen: false,
      fileAnalysis: {
        fileId: null,
        loading: false,
        error: null,
        markdown: null,
      },
      chatOpen: false,
      chatMessages: [],
      chatLoading: false,

      setGraph: (g) => set({ graph: g }),
      selectNode: (id) => set({ selectedNodeId: id }),
      hoverNode: (id) => set({ hoveredNodeId: id }),
      setHighlighted: (ids, explanation = null) =>
        set({ highlightedNodeIds: ids, queryExplanation: explanation }),
      cacheSummary: (s) =>
        set((state) => ({ summaries: { ...state.summaries, [s.fileId]: s } })),
      setOnboarding: (steps) => set({ onboarding: steps }),
      setCurrentStep: (i) => set({ currentStepIndex: i }),
      setFileAnalysisOpen: (open) => set({ fileAnalysisOpen: open }),
      setFileAnalysis: (state) =>
        set((current) => ({
          fileAnalysis: {
            ...current.fileAnalysis,
            ...state,
          },
        })),
      setChatOpen: (open) => set({ chatOpen: open }),
      setChatMessages: (messages) => set({ chatMessages: messages }),
      appendChatMessage: (message) =>
        set((current) => ({ chatMessages: [...current.chatMessages, message] })),
      setChatLoading: (loading) => set({ chatLoading: loading }),
      resetChat: () => set({ chatMessages: [], chatLoading: false }),
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
          fileAnalysisOpen: false,
          fileAnalysis: {
            fileId: null,
            loading: false,
            error: null,
            markdown: null,
          },
          chatOpen: false,
          chatMessages: [],
          chatLoading: false,
        }),
    }),
    {
      name: "codemap-graph-store",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        graph: state.graph,
        summaries: state.summaries,
        onboarding: state.onboarding,
        currentStepIndex: state.currentStepIndex,
        highlightedNodeIds: state.highlightedNodeIds,
        queryExplanation: state.queryExplanation,
        selectedNodeId: state.selectedNodeId,
        hoveredNodeId: state.hoveredNodeId,
      }),
    },
  ),
);
