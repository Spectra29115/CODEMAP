import { Boxes, Network } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "2d" | "3d";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeToggle = ({ value, onChange }: ViewModeToggleProps) => {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("2d")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          value === "2d"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Network className="h-3.5 w-3.5" />
        2D
      </button>
      <button
        type="button"
        onClick={() => onChange("3d")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          value === "3d"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Boxes className="h-3.5 w-3.5" />
        3D
      </button>
    </div>
  );
};
