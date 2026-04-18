import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Zap, Box, Wrench, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeCategory } from "@/types/graph";

export interface FileNodeData {
  label: string;
  path: string;
  category: NodeCategory;
  riskLevel: "low" | "medium" | "high";
  loc: number;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isSelected?: boolean;
}

const categoryStyles: Record<NodeCategory, { ring: string; bg: string; text: string; icon: JSX.Element; label: string }> = {
  entry: {
    ring: "ring-node-entry/60 border-node-entry/50",
    bg: "bg-node-entry/10",
    text: "text-node-entry",
    icon: <Zap className="h-3.5 w-3.5" />,
    label: "Entry",
  },
  core: {
    ring: "ring-node-core/60 border-node-core/50",
    bg: "bg-node-core/10",
    text: "text-node-core",
    icon: <Box className="h-3.5 w-3.5" />,
    label: "Core",
  },
  utility: {
    ring: "ring-node-utility/50 border-node-utility/40",
    bg: "bg-node-utility/10",
    text: "text-muted-foreground",
    icon: <Wrench className="h-3.5 w-3.5" />,
    label: "Utility",
  },
  risk: {
    ring: "ring-node-risk/60 border-node-risk/50",
    bg: "bg-node-risk/10",
    text: "text-node-risk",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Risk",
  },
};

const FileNode = ({ data, selected }: NodeProps<FileNodeData>) => {
  const style = categoryStyles[data.category];
  const highRisk = data.riskLevel === "high";

  return (
    <div
      className={cn(
        "group relative min-w-[180px] rounded-xl border backdrop-blur-md transition-all duration-200",
        "bg-card/80 px-3.5 py-2.5",
        style.ring,
        data.isSelected || selected ? "ring-2 shadow-glow scale-[1.04]" : "ring-1",
        data.isHighlighted && "ring-2 shadow-glow animate-pulse-glow",
        data.isDimmed && "opacity-30",
        highRisk && "shadow-[0_0_20px_-4px_hsl(var(--node-risk)/0.7)]",
      )}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", style.bg, style.text)}>
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px] font-medium text-foreground">{data.label}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={cn("uppercase tracking-wider", style.text)}>{style.label}</span>
            <span>·</span>
            <span>{data.loc} LOC</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(FileNode);
