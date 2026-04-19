import { ReactNode, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarkdownText from "@/components/MarkdownText";
import { api } from "@/services/api";
import { useGraphStore } from "@/store/useGraphStore";
import type { ChatMessage } from "@/types/graph";
import { classifyNode } from "@/utils/fileImportance";

interface AIDrawerProps {
  trigger: ReactNode;
}

const STARTERS = [
  "What are the most critical files?",
  "Explain the overall architecture",
  "What does selected file depend on?",
];

export default function AIDrawer({ trigger }: AIDrawerProps) {
  const graph = useGraphStore((s) => s.graph);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const chatOpen = useGraphStore((s) => s.chatOpen);
  const setChatOpen = useGraphStore((s) => s.setChatOpen);
  const chatMessages = useGraphStore((s) => s.chatMessages);
  const appendChatMessage = useGraphStore((s) => s.appendChatMessage);
  const chatLoading = useGraphStore((s) => s.chatLoading);
  const setChatLoading = useGraphStore((s) => s.setChatLoading);

  const [message, setMessage] = useState("");

  const selectedNode = useMemo(() => {
    if (!graph || !selectedNodeId) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [graph, selectedNodeId]);

  const criticalFiles = useMemo(() => {
    if (!graph) return [] as string[];
    return graph.nodes.filter((n) => classifyNode(n.path).level === 1).map((n) => n.label);
  }, [graph]);

  const highFiles = useMemo(() => {
    if (!graph) return [] as string[];
    return graph.nodes.filter((n) => classifyNode(n.path).level === 2).map((n) => n.label);
  }, [graph]);

  const send = async (text: string) => {
    if (!graph || !text.trim() || chatLoading) return;
    const userText = text.trim();

    appendChatMessage({ role: "user", content: userText });
    setMessage("");
    setChatLoading(true);

    try {
      const outgoing: ChatMessage[] = [...chatMessages, { role: "user", content: userText }];
      const res = await api.chat({
        graphId: graph.id,
        messages: outgoing,
        selectedNodeId: selectedNode?.id,
        systemPrompt: [
          "You are an intelligent assistant embedded inside a file graph visualization tool.",
          "You can answer both project-specific questions and general technical questions.",
          "When the question is about this repository, prioritize the graph context below.",
          "When the question is general, provide a direct useful answer without forcing repo references.",
          "",
          "You have full awareness of the current project graph:",
          `- Total nodes: ${graph.nodes.length}`,
          `- Total edges: ${graph.edges.length}`,
          `- Critical files (L1): ${criticalFiles.join(", ") || "none"}`,
          `- High importance files (L2): ${highFiles.join(", ") || "none"}`,
          `- Currently selected node: ${selectedNode?.label ?? "none"}`,
          "",
          "Use this context to answer questions about the project structure, file relationships, architecture decisions, and code organization. Be concise, technical, and specific. When referencing files, use their exact names.",
        ].join("\n"),
      });
      appendChatMessage({ role: "assistant", content: res.reply });
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      appendChatMessage({
        role: "assistant",
        content:
          status === 429
            ? "- **Answer:** The assistant is temporarily rate-limited right now.\n- **Next step:** Wait a moment and try again after the analysis requests cool down."
            : "- **Answer:** The assistant is temporarily unavailable.\n- **Next step:** Verify backend API and Groq configuration, then retry.",
      });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setChatOpen(!chatOpen)}>{trigger}</div>

      <AnimatePresence>
        {chatOpen && graph && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 top-14 z-30 w-[360px] rounded-xl border border-white/15 bg-[#0b1020]/72 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-white/90">
                <Sparkles className="h-3.5 w-3.5 text-[#BF5AF2]" /> ✨ Ask AI
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="rounded border border-white/20 p-1 text-white/70 hover:bg-white/10"
                aria-label="Close Ask AI panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-[360px] space-y-2 overflow-auto px-3 py-2">
              {chatMessages.length === 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-white/60">Try one of these:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => send(starter.replace("selected file", selectedNode?.label ?? "selected file"))}
                        className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
                      >
                        {starter.replace("selected file", selectedNode?.label ?? "selected file")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={`${msg.role}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs ${msg.role === "user" ? "bg-[#BF5AF2]/25 border border-[#BF5AF2]/45 text-white" : "bg-white/10 border border-white/10 text-white/90"}`}>
                    <MarkdownText text={msg.content} className="text-xs" />
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> ...
                </div>
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t border-white/10 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(message);
              }}
            >
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about architecture, dependencies, or files..."
                className="h-8 border-white/15 bg-black/20 text-xs text-white placeholder:text-white/45"
              />
              <Button type="submit" size="sm" className="h-8 bg-gradient-to-r from-[#BF5AF2] to-[#7c4dff] text-xs">
                Send
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
