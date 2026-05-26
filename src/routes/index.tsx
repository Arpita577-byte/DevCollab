import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ArrowRight, Sparkles, KanbanSquare, Code2, BookOpen, Bot, Users, Zap,
  CheckCircle2, GitBranch, MessagesSquare, Activity,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevCollab — All-in-one workspace for student dev teams" },
      { name: "description", content: "Kanban, docs, snippets, and an AI project assistant — built for student developer teams to ship together." },
      { property: "og:title", content: "DevCollab — Real-time collaboration for developers" },
      { property: "og:description", content: "GitHub-meets-Notion-meets-Slack for student dev teams." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Features />
      <AiSection />
      <Pricing />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#ai" className="hover:text-foreground transition-colors">AI Assistant</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/auth">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>AI-powered project assistant included</span>
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          Where student dev teams <span className="text-gradient">ship together</span>.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          One workspace for tasks, docs, code snippets, and real-time collaboration —
          supercharged by an AI assistant that understands your project.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 h-12 px-6">
            <Link to="/auth">Start building free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6">
            <a href="#features">See how it works</a>
          </Button>
        </div>
        <div className="mt-16 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
          <div className="relative glass rounded-2xl p-2 shadow-elegant">
            <div className="rounded-xl bg-surface p-6 grid grid-cols-3 gap-4 text-left">
              {["To Do", "In Progress", "In Review"].map((col, i) => (
                <div key={col} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col}</span>
                    <span className="text-xs text-muted-foreground">{[4,3,2][i]}</span>
                  </div>
                  {[0,1,2].slice(0, [3,2,1][i]).map(n => (
                    <div key={n} className="rounded-lg bg-surface-elevated p-3 border border-border/50">
                      <div className="h-2 w-3/4 rounded bg-muted mb-2" />
                      <div className="h-2 w-1/2 rounded bg-muted/60" />
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-gradient-primary" />
                        <span className="text-[10px] text-muted-foreground">P{i}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: KanbanSquare, title: "Kanban that flows", desc: "Drag tasks across To Do → In Progress → In Review → Done. Priorities, labels, due dates, assignees." },
  { icon: Code2, title: "Code snippet vault", desc: "Save reusable snippets with syntax highlighting. Search by tag, copy with one click." },
  { icon: BookOpen, title: "Docs that link up", desc: "Write project wikis with rich text. Version history built in." },
  { icon: Bot, title: "AI project assistant", desc: "Summarize progress, generate standups, break down features into tasks automatically." },
  { icon: Users, title: "Roles & invites", desc: "Owner, Admin, Member, Viewer. Invite teammates with a single link." },
  { icon: Activity, title: "Activity feed", desc: "See every move, comment, and update across your workspace in real time." },
];

function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Everything your team needs, <span className="text-gradient">nothing it doesn't</span>.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Stop juggling Jira, Notion, and Slack. DevCollab unifies it all.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group relative rounded-2xl glass p-6 hover:border-primary/40 transition-all">
              <div className="h-11 w-11 rounded-xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section id="ai" className="py-24 md:py-32 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-accent mb-4">
            <Bot className="h-3.5 w-3.5" /> AI Assistant
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Your team's <span className="text-gradient">co-pilot</span>.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Built-in AI that reads your tasks and tells you exactly what's blocking your team — or
            breaks a single feature description into a full task list.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Summarize project progress in one click",
              "Identify blocked or stale tasks",
              "Auto-generate daily standup reports",
              "Break features into 6+ atomic subtasks",
              "Review code for bugs, perf, and security",
            ].map(item => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-6 shadow-elegant">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Zap className="h-3.5 w-3.5 text-accent" />
            <span>Generating standup report...</span>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-foreground">Yesterday</p>
              <p className="text-muted-foreground">Riya merged auth flow PR. Ankush moved 3 tasks to In Review.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Today</p>
              <p className="text-muted-foreground">Focus on payment integration. 2 tasks awaiting review need attention.</p>
            </div>
            <div>
              <p className="font-semibold text-warning">Blockers</p>
              <p className="text-muted-foreground">"Connect Stripe webhook" stuck in In Progress for 4 days — needs API key from admin.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Free", price: "$0", desc: "For getting started",
      features: ["1 workspace", "3 projects", "5 members", "Basic AI features"],
      cta: "Start free", featured: false,
    },
    {
      name: "Pro", price: "$12", suffix: "/user/mo",
      desc: "For serious teams",
      features: ["Unlimited workspaces", "Unlimited projects", "Unlimited members", "All AI features", "Priority support"],
      cta: "Upgrade to Pro", featured: true,
    },
  ];
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-4 text-muted-foreground text-lg">Free for student teams. Upgrade when you outgrow it.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {tiers.map(t => (
            <div key={t.name} className={`rounded-2xl p-8 ${t.featured ? "glass border-primary/50 shadow-glow" : "glass"}`}>
              <h3 className="font-display text-2xl font-bold">{t.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">{t.price}</span>
                {t.suffix && <span className="text-muted-foreground text-sm">{t.suffix}</span>}
              </div>
              <ul className="mt-6 space-y-2">
                {t.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className={`mt-8 w-full ${t.featured ? "bg-gradient-primary text-primary-foreground" : ""}`} variant={t.featured ? "default" : "outline"}>
                <Link to="/auth">{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <Logo />
        <p>© 2026 DevCollab. Built for student dev teams.</p>
        <div className="flex items-center gap-4">
          <GitBranch className="h-4 w-4" />
          <MessagesSquare className="h-4 w-4" />
        </div>
      </div>
    </footer>
  );
}
