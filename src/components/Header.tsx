import { Github, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  onExplainRepo: () => void;
  hasGraph: boolean;
}

export const Header = ({ onExplainRepo, hasGraph }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground glow-primary">
            <Github className="h-4.5 w-4.5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
              Repository Architecture Navigator
            </h1>
            <p className="text-xs text-muted-foreground">
              Understand any codebase in seconds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="default"
            size="sm"
            onClick={onExplainRepo}
            disabled={!hasGraph}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Explain Repository
          </Button>
        </div>
      </div>
    </header>
  );
};
