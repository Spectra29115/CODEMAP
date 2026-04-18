import { FormEvent } from "react";
import { Github, Loader2, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";

interface InputBarProps {
  repoUrl: string;
  onRepoUrlChange: (v: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSearch: (q: string) => void;
  hasGraph: boolean;
}

export const InputBar = ({
  repoUrl,
  onRepoUrlChange,
  onAnalyze,
  isAnalyzing,
  searchQuery,
  onSearchChange,
  onSearch,
  hasGraph,
}: InputBarProps) => {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isAnalyzing) onAnalyze();
  };

  return (
    <div className="border-b border-border/60 bg-background/40 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
        {/* TODO: POST /analyze { repo_url } */}
        <form onSubmit={submit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={repoUrl}
              onChange={(e) => onRepoUrlChange(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="h-10 pl-9 font-mono text-sm"
              disabled={isAnalyzing}
            />
          </div>
          <Button type="submit" disabled={isAnalyzing || !repoUrl.trim()} className="gap-2">
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </form>

        <div className="lg:w-[360px]">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            onSubmit={onSearch}
            disabled={!hasGraph}
          />
        </div>
      </div>
    </div>
  );
};
