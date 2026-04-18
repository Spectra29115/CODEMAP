import { Layers, Library, Map, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface RepoSummary {
  overview: string;
  techStack: string[];
  keyModules: string[];
  architectureNotes: string;
}

interface SummaryModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summary: RepoSummary | null;
  loading: boolean;
  repoUrl: string;
}

export const SummaryModal = ({ open, onOpenChange, summary, loading, repoUrl }: SummaryModalProps) => {
  // TODO: POST /repo-summary { repo_url } — currently uses mock data
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <DialogTitle>Repository Summary</DialogTitle>
          </div>
          <DialogDescription className="break-all font-mono text-xs">
            {repoUrl || "Repository summary will appear here"}
          </DialogDescription>
        </DialogHeader>

        {loading || !summary ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <Section icon={<Library className="h-3.5 w-3.5 text-primary" />} title="Overview">
              <p className="text-sm leading-relaxed text-foreground/90">{summary.overview}</p>
            </Section>

            <Section icon={<Layers className="h-3.5 w-3.5 text-primary" />} title="Tech stack">
              <div className="flex flex-wrap gap-1.5">
                {summary.techStack.map((t) => (
                  <Badge key={t} variant="secondary" className="font-mono text-[11px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </Section>

            <Section icon={<Map className="h-3.5 w-3.5 text-primary" />} title="Key modules">
              <ul className="space-y-1.5">
                {summary.keyModules.map((m) => (
                  <li
                    key={m}
                    className="rounded-md border border-border/40 bg-background/40 px-3 py-1.5 font-mono text-[11px] text-foreground/90"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
              title="Architecture notes"
            >
              <p className="text-sm leading-relaxed text-foreground/90">
                {summary.architectureNotes}
              </p>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="mb-2 flex items-center gap-2">
      {icon}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
    </div>
    {children}
  </div>
);
