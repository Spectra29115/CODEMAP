import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Github,
  Loader2,
  Network,
  Sparkles,
  Workflow,
  GitBranch,
  Zap,
  Search,
  Map,
  ShieldAlert,
  MessageSquare,
  Quote,
  FileCode,
  Layers,
  Eye,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/services/api";
import { useGraphStore } from "@/store/useGraphStore";
import { toast } from "sonner";

const FEATURES = [
  { icon: Network, title: "Architecture graph", desc: "See how every file connects in one interactive map." },
  { icon: Sparkles, title: "AI summaries", desc: "Plain-English explanations of every module and risk hotspot." },
  { icon: Workflow, title: "Guided onboarding", desc: "A curated reading order to ramp up on any codebase fast." },
  { icon: GitBranch, title: "Natural-language queries", desc: "Ask “Where is auth?” and watch the graph light up." },
];

const STEPS = [
  {
    icon: Github,
    title: "1. Drop a repo URL",
    desc: "Paste any public GitHub link. RepoNav clones, parses, and builds a dependency graph in seconds.",
  },
  {
    icon: Brain,
    title: "2. AI maps the architecture",
    desc: "We analyze imports, call graphs, and ownership signals to identify entry points, core logic, and hotspots.",
  },
  {
    icon: Eye,
    title: "3. Explore visually",
    desc: "Interactive graph, file tree, summaries, and risk indicators — all in one developer-focused dashboard.",
  },
  {
    icon: MessageSquare,
    title: "4. Ask anything",
    desc: "“Where is payment handled?” “What does this util do?” Natural-language queries highlight the answer.",
  },
];

const DEEP_FEATURES = [
  {
    icon: Layers,
    title: "Smart layering",
    desc: "Dagre-powered hierarchical layouts keep even sprawling monorepos legible.",
  },
  {
    icon: ShieldAlert,
    title: "Risk hotspots",
    desc: "High-impact files glow red so you know what not to break on day one.",
  },
  {
    icon: Search,
    title: "Instant file search",
    desc: "Fuzzy-search 10k+ files in the sidebar without leaving the graph.",
  },
  {
    icon: Map,
    title: "Onboarding paths",
    desc: "A guided reading order — from entry points to the deep ends — generated per repo.",
  },
  {
    icon: FileCode,
    title: "Per-file context",
    desc: "Click any node for an AI summary, dependencies, reverse deps, and complexity metrics.",
  },
  {
    icon: Zap,
    title: "Keyboard-first",
    desc: "Zoom, pan, fit, and jump between steps with shortcuts. Built for power users.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I shipped my first PR in a 400k-line repo on day two. RepoNav is unfair.",
    name: "Maya R.",
    role: "Senior Engineer, fintech",
  },
  {
    quote: "We use it for every onboarding. The guided path alone saves a week per hire.",
    name: "Daniel K.",
    role: "Engineering Manager",
  },
  {
    quote: "Finally a code-graph tool that doesn’t look like a 2008 UML diagram.",
    name: "Priya S.",
    role: "Staff Engineer, devtools",
  },
];

// Pricing removed

const FAQS = [
  {
    q: "Does RepoNav store my source code?",
    a: "No. We parse repositories in ephemeral environments and store only the resulting graph metadata. Source is never persisted.",
  },
  {
    q: "Which languages are supported?",
    a: "TypeScript, JavaScript, Python, Go, Rust, and Java today. More coming — let us know what you need.",
  },
  {
    q: "Can I use it on private repos?",
    a: "Yes, on the Pro and Team plans. We use a least-privilege GitHub App with read-only access.",
  },
  {
    q: "How accurate are the AI summaries?",
    a: "Summaries are grounded in the actual import graph and file contents, with citations to the source ranges they describe.",
  },
  {
    q: "Is there an API?",
    a: "Yes — every graph, summary, and query endpoint is available via REST for Pro and Team customers.",
  },
];

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const Landing = () => {
  const navigate = useNavigate();
  const setGraph = useGraphStore((s) => s.setGraph);
  const setOnboarding = useGraphStore((s) => s.setOnboarding);
  const reset = useGraphStore((s) => s.reset);
  const [url, setUrl] = useState("https://github.com/vercel/next.js");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      reset();
      const { graphId } = await api.analyzeRepo(url.trim());
      const [graph, onboarding] = await Promise.all([
        api.getGraph(graphId, url.trim()),
        api.getOnboarding(graphId),
      ]);
      setGraph(graph);
      setOnboarding(onboarding);
      navigate("/dashboard");
    } catch {
      toast.error("Failed to analyze repository.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Background flourishes */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-gradient-hero opacity-90" />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.12]" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[80vh] h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="#top" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Network className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight">RepoNav</span>
            <span className="ml-1 rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              beta
            </span>
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex"
            >
              <Github className="h-3.5 w-3.5" /> Star
            </a>
            <a
              href="#cta"
              className="rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-90"
            >
              Try the demo
            </a>
          </div>
        </div>
      </header>

      <span id="top" />

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-16 text-center md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground"
        >
          <Zap className="h-3 w-3 text-primary-glow" />
          Repository Architecture Navigator
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 font-mono text-5xl font-bold tracking-tight md:text-6xl"
        >
          <span className="text-gradient">Navigate any repo</span>
          <br />
          <span className="text-foreground">at the speed of thought.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground"
        >
          Drop in any GitHub repo. RepoNav builds an interactive 3D map of the architecture, surfaces high-impact files, and answers questions in plain English — your AI-powered tour guide for unfamiliar code.
        </motion.p>

        <motion.form
          id="cta"
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mt-9 flex max-w-2xl items-center gap-2 glass rounded-xl p-2"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground">
            <Github className="h-4 w-4" />
          </div>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="h-9 flex-1 border-0 bg-transparent font-mono text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-9 gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                Analyze Repository <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </motion.form>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Tip: any URL works in the demo — we’ll map a sample architecture.
        </p>

        {/* Feature grid */}
        <div id="features" className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-4 text-left md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
              className="glass-panel rounded-xl p-4 transition-all hover:border-primary/40 hover:shadow-glow"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-glow">
                <f.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Logos / social proof */}
      <section className="relative z-10 mx-auto mt-24 max-w-5xl px-6">
        <motion.p {...fadeUp} className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by engineers shipping at
        </motion.p>
        <motion.div
          {...fadeUp}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 font-mono text-sm text-muted-foreground/80"
        >
          {["vercel", "linear", "supabase", "stripe", "datadog", "render"].map((b) => (
            <span key={b} className="opacity-70 transition-opacity hover:opacity-100">
              {b}
            </span>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto mt-32 max-w-6xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground">
            <Workflow className="h-3 w-3 text-primary-glow" /> How it works
          </div>
          <h2 className="mt-4 font-mono text-3xl font-bold tracking-tight md:text-4xl">
            From URL to <span className="text-gradient">full architecture</span> in 4 steps
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            No setup, no integrations to wire up. Paste a link and start exploring.
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-panel relative rounded-xl p-5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">{s.title}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Deep features (alternating) */}
      <section className="relative z-10 mx-auto mt-32 max-w-6xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary-glow" /> Built for depth
          </div>
          <h2 className="mt-4 font-mono text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to <span className="text-gradient">read code faster</span>
          </h2>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEEP_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glass-panel group rounded-xl p-5 transition-all hover:border-primary/40 hover:shadow-glow"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-glow transition-transform group-hover:scale-110">
                <f.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Showcase / preview */}
      <section className="relative z-10 mx-auto mt-32 max-w-6xl px-6">
        <motion.div {...fadeUp} className="glass rounded-2xl p-2">
          <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
            <span className="ml-3 font-mono text-[11px] text-muted-foreground">reponav.app/dashboard</span>
          </div>
          <div className="grid grid-cols-12 gap-2 p-3">
            <div className="col-span-3 hidden rounded-lg bg-sidebar/60 p-3 md:block">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Onboarding</div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px]">{i}</span>
                  <span className="font-mono">step-{i}.ts</span>
                </div>
              ))}
            </div>
            <div className="col-span-12 grid-bg relative aspect-[16/9] overflow-hidden rounded-lg bg-card/40 md:col-span-9">
              {/* Fake graph nodes */}
              {[
                { x: "50%", y: "12%", c: "node-entry", l: "index.ts" },
                { x: "20%", y: "45%", c: "node-core", l: "router.ts" },
                { x: "78%", y: "45%", c: "node-core", l: "store.ts" },
                { x: "12%", y: "78%", c: "node-utility", l: "utils.ts" },
                { x: "42%", y: "78%", c: "node-risk", l: "auth.ts" },
                { x: "75%", y: "78%", c: "node-utility", l: "api.ts" },
              ].map((n) => (
                <div
                  key={n.l}
                  className="glass absolute -translate-x-1/2 -translate-y-1/2 rounded-md px-2.5 py-1 font-mono text-[10px]"
                  style={{ left: n.x, top: n.y }}
                >
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: `hsl(var(--${n.c}))` }} />
                  {n.l}
                </div>
              ))}
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                {[
                  ["50%", "12%", "20%", "45%"],
                  ["50%", "12%", "78%", "45%"],
                  ["20%", "45%", "12%", "78%"],
                  ["20%", "45%", "42%", "78%"],
                  ["78%", "45%", "42%", "78%"],
                  ["78%", "45%", "75%", "78%"],
                ].map((c, i) => (
                  <line
                    key={i}
                    x1={c[0]}
                    y1={c[1]}
                    x2={c[2]}
                    y2={c[3]}
                    stroke="hsl(var(--muted-foreground) / 0.4)"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 mx-auto mt-32 max-w-6xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground">
            <Quote className="h-3 w-3 text-primary-glow" /> Loved by developers
          </div>
          <h2 className="mt-4 font-mono text-3xl font-bold tracking-tight md:text-4xl">
            What teams are <span className="text-gradient">saying</span>
          </h2>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="glass-panel rounded-xl p-6"
            >
              <Quote className="h-5 w-5 text-primary-glow" />
              <blockquote className="mt-3 text-sm leading-relaxed text-foreground">“{t.quote}”</blockquote>
              <figcaption className="mt-4 border-t border-border/60 pt-3">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* Pricing section removed */}

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto mt-32 max-w-3xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground">
            <MessageSquare className="h-3 w-3 text-primary-glow" /> FAQ
          </div>
          <h2 className="mt-4 font-mono text-3xl font-bold tracking-tight md:text-4xl">
            Questions, <span className="text-gradient">answered</span>
          </h2>
        </motion.div>

        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <motion.details
              key={f.q}
              {...fadeUp}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="glass-panel group rounded-xl p-4 open:border-primary/40"
            >
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                {f.q}
                <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto mt-32 max-w-4xl px-6">
        <motion.div {...fadeUp} className="glass relative overflow-hidden rounded-2xl p-10 text-center">
          <div className="absolute inset-0 bg-gradient-hero opacity-60" />
          <div className="relative">
            <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
              Stop reading code. <span className="text-gradient">Start understanding it.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Try the demo with any GitHub repo — no signup required.
            </p>
            <a
              href="#cta"
              className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-90"
            >
              Analyze a repo <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-24 border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-primary">
              <Network className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
            <span className="font-mono">RepoNav © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </a>
            ))}
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
